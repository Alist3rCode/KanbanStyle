import { Router } from "express";
import { db } from "../db.js";
import { decrypt, encrypt } from "../crypto.js";

export const jiraRouter = Router();

type JiraAuthType = "cloud" | "server";

function isJiraAuthType(value: unknown): value is JiraAuthType {
  return value === "cloud" || value === "server";
}

function getSetting(key: string): string | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

function setSetting(key: string, value: string) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}

function deleteSetting(key: string) {
  db.prepare("DELETE FROM settings WHERE key = ?").run(key);
}

interface JiraConfig {
  domain: string;
  authType: JiraAuthType;
  email: string | null;
  token: string;
}

function getJiraConfig(): JiraConfig | null {
  const domain = getSetting("jira_domain");
  const tokenEnc = getSetting("jira_token_enc");
  if (!domain || !tokenEnc) return null;
  const authType = getSetting("jira_auth_type");
  return {
    domain,
    authType: isJiraAuthType(authType) ? authType : "cloud",
    email: getSetting("jira_email"),
    token: decrypt(tokenEnc),
  };
}

/**
 * Jira Cloud (*.atlassian.net) requires Basic auth with `email:api_token`
 * base64-encoded — a bearer token is silently rejected there. Only Jira
 * Server/Data Center Personal Access Tokens use `Authorization: Bearer`.
 * Getting this wrong (as the previous always-Bearer implementation did) is
 * why the integration never worked for anyone on Jira Cloud.
 */
function authHeader(config: JiraConfig): string {
  if (config.authType === "cloud") {
    return `Basic ${Buffer.from(`${config.email ?? ""}:${config.token}`).toString("base64")}`;
  }
  return `Bearer ${config.token}`;
}

/** /rest/api/2/myself is supported by both Jira Cloud and Server/Data Center — used as the connection test. */
function myselfUrl(domain: string): string {
  return `https://${domain}/rest/api/2/myself`;
}

function issueUrl(domain: string, issueKey: string): string {
  return `https://${domain}/rest/api/2/issue/${encodeURIComponent(issueKey)}`;
}

jiraRouter.get("/integrations/jira", (_req, res) => {
  const domain = getSetting("jira_domain");
  const authType = getSetting("jira_auth_type");
  const configured = Boolean(domain && getSetting("jira_token_enc"));
  res.json({
    domain,
    email: getSetting("jira_email"),
    authType: isJiraAuthType(authType) ? authType : "cloud",
    configured,
  });
});

jiraRouter.put("/integrations/jira", (req, res) => {
  const { domain, email, authType, token } = req.body as {
    domain?: string;
    email?: string;
    authType?: string;
    token?: string;
  };
  if (!domain?.trim() || !token?.trim() || !isJiraAuthType(authType)) {
    res.status(400).json({ error: "domain, authType (cloud|server) et token sont requis" });
    return;
  }
  if (authType === "cloud" && !email?.trim()) {
    res.status(400).json({ error: "email est requis pour Jira Cloud" });
    return;
  }
  setSetting("jira_domain", domain.trim());
  setSetting("jira_auth_type", authType);
  if (authType === "cloud") {
    setSetting("jira_email", email!.trim());
  } else {
    deleteSetting("jira_email");
  }
  setSetting("jira_token_enc", encrypt(token.trim()));
  res.status(204).end();
});

jiraRouter.delete("/integrations/jira", (_req, res) => {
  db.prepare(
    "DELETE FROM settings WHERE key IN ('jira_domain', 'jira_email', 'jira_auth_type', 'jira_token_enc')",
  ).run();
  res.status(204).end();
});

/** Calls /myself with no side effects — lets the user verify the saved credentials work right after saving them. */
jiraRouter.get("/integrations/jira/test", async (_req, res) => {
  const config = getJiraConfig();
  if (!config) {
    res.status(400).json({ error: "Intégration Jira non configurée" });
    return;
  }

  let jiraRes: Response;
  try {
    jiraRes = await fetch(myselfUrl(config.domain), {
      headers: { Authorization: authHeader(config), Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    res.status(503).json({ error: "Jira injoignable (vérifie le domaine et ta connexion réseau)" });
    return;
  }

  if (jiraRes.status === 401 || jiraRes.status === 403) {
    res.status(502).json({
      error:
        config.authType === "cloud"
          ? "Authentification refusée (vérifie l'email et le token API Jira Cloud)"
          : "Authentification refusée (vérifie le Personal Access Token)",
    });
    return;
  }
  if (!jiraRes.ok) {
    res.status(502).json({ error: `Erreur Jira (${jiraRes.status})` });
    return;
  }

  const user = (await jiraRes.json()) as { displayName?: string; emailAddress?: string };
  res.json({ displayName: user.displayName ?? "?", emailAddress: user.emailAddress ?? null });
});

jiraRouter.get("/jira/issues/:issueKey", async (req, res) => {
  const config = getJiraConfig();
  if (!config) {
    res.status(400).json({ error: "Intégration Jira non configurée" });
    return;
  }

  let jiraRes: Response;
  try {
    jiraRes = await fetch(issueUrl(config.domain, req.params.issueKey), {
      headers: {
        Authorization: authHeader(config),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    res.status(503).json({ error: "Jira injoignable (vérifie ta connexion réseau)" });
    return;
  }

  if (jiraRes.status === 401 || jiraRes.status === 403) {
    res.status(502).json({ error: "Authentification Jira invalide (vérifie le token)" });
    return;
  }
  if (jiraRes.status === 404) {
    res.status(404).json({ error: "Ticket Jira introuvable" });
    return;
  }
  if (!jiraRes.ok) {
    res.status(502).json({ error: `Erreur Jira (${jiraRes.status})` });
    return;
  }

  const issue = (await jiraRes.json()) as {
    key: string;
    fields: { summary: string; status?: { name: string }; issuetype?: { name: string } };
  };
  res.json({
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status?.name ?? null,
    issueType: issue.fields.issuetype?.name ?? null,
    url: `https://${config.domain}/browse/${issue.key}`,
  });
});

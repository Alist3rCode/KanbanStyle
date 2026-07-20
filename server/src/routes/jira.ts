import { Router } from "express";
import { db } from "../db.js";
import { decrypt, encrypt } from "../crypto.js";

export const jiraRouter = Router();

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

function getJiraConfig(): { domain: string; token: string } | null {
  const domain = getSetting("jira_domain");
  const tokenEnc = getSetting("jira_token_enc");
  if (!domain || !tokenEnc) return null;
  return { domain, token: decrypt(tokenEnc) };
}

jiraRouter.get("/integrations/jira", (_req, res) => {
  const domain = getSetting("jira_domain");
  const configured = Boolean(domain && getSetting("jira_token_enc"));
  res.json({ domain, configured });
});

jiraRouter.put("/integrations/jira", (req, res) => {
  const { domain, token } = req.body as { domain?: string; token?: string };
  if (!domain?.trim() || !token?.trim()) {
    res.status(400).json({ error: "domain et token sont requis" });
    return;
  }
  setSetting("jira_domain", domain.trim());
  setSetting("jira_token_enc", encrypt(token.trim()));
  res.status(204).end();
});

jiraRouter.delete("/integrations/jira", (_req, res) => {
  db.prepare("DELETE FROM settings WHERE key IN ('jira_domain', 'jira_token_enc')").run();
  res.status(204).end();
});

jiraRouter.get("/jira/issues/:issueKey", async (req, res) => {
  const config = getJiraConfig();
  if (!config) {
    res.status(400).json({ error: "Intégration Jira non configurée" });
    return;
  }

  const url = `https://${config.domain}/rest/api/3/issue/${encodeURIComponent(req.params.issueKey)}`;
  let jiraRes: Response;
  try {
    jiraRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
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

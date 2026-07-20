import { useEffect, useState } from "react";
import { jiraApi, type JiraIssue } from "@/lib/jira";
import { Button } from "@/components/ui/button";

function JiraSettings() {
  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [testKey, setTestKey] = useState("");
  const [testResult, setTestResult] = useState<JiraIssue | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    jiraApi.getConfig().then((config) => {
      setDomain(config.domain ?? "");
      setConfigured(config.configured);
    });
  }, []);

  async function handleSave() {
    setMessage(null);
    try {
      await jiraApi.setConfig(domain.trim(), token.trim());
      setConfigured(true);
      setToken("");
      setMessage("Configuration enregistrée.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    }
  }

  async function handleClear() {
    await jiraApi.clearConfig();
    setDomain("");
    setToken("");
    setConfigured(false);
    setMessage(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      setTestResult(await jiraApi.getIssue(testKey.trim()));
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setTesting(false);
    }
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Intégration Jira</h2>
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <input
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="entreprise.atlassian.net"
          value={domain}
          onChange={(e) => setDomain(e.currentTarget.value)}
        />
        <input
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder={configured ? "•••••••• (déjà enregistré)" : "Bearer token"}
          type="password"
          value={token}
          onChange={(e) => setToken(e.currentTarget.value)}
        />
        <div className="flex gap-2">
          <Button onClick={handleSave}>Enregistrer</Button>
          {configured && (
            <Button variant="ghost" onClick={handleClear}>
              Supprimer
            </Button>
          )}
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>

      {configured && (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-border p-3">
          <p className="text-sm text-muted-foreground">Tester avec une clé de ticket (ex: PROJ-123)</p>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="PROJ-123"
              value={testKey}
              onChange={(e) => setTestKey(e.currentTarget.value)}
            />
            <Button variant="outline" onClick={handleTest} disabled={testing || !testKey.trim()}>
              Tester
            </Button>
          </div>
          {testError && <p className="text-sm text-destructive">{testError}</p>}
          {testResult && (
            <a
              className="text-sm text-primary underline"
              href={testResult.url}
              target="_blank"
              rel="noreferrer"
            >
              {testResult.key} — {testResult.summary} ({testResult.status})
            </a>
          )}
        </div>
      )}
    </section>
  );
}

export function SettingsPage({ onBack }: { onBack: () => void }) {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <Button variant="ghost" onClick={onBack}>
          Retour
        </Button>
      </div>

      <JiraSettings />
    </main>
  );
}

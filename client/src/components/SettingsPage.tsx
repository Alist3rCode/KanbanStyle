import { useEffect, useState } from "react";
import { ArrowLeft, Monitor, Moon, Sun } from "lucide-react";
import { jiraApi, type JiraIssue } from "@/lib/jira";
import type { Theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { TopBar, topBarButtonClass } from "@/components/TopBar";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Système", icon: Monitor },
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ThemeSettings({
  theme,
  setTheme,
}: {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}) {
  return (
    <Section title="Thème">
      <div className="inline-flex rounded-lg border border-border p-1">
        {THEME_OPTIONS.map((option) => {
          const active = theme === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icon className="size-4" />
              {option.label}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

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

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <Section title="Intégration Jira">
      <div className="flex flex-col gap-2">
        <input
          className={inputClass}
          placeholder="entreprise.atlassian.net"
          value={domain}
          onChange={(e) => setDomain(e.currentTarget.value)}
        />
        <input
          className={inputClass}
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
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-sm text-muted-foreground">
            Tester avec une clé de ticket (ex: PROJ-123)
          </p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="PROJ-123"
              value={testKey}
              onChange={(e) => setTestKey(e.currentTarget.value)}
            />
            <Button variant="outline" onClick={handleTest} disabled={testing || !testKey.trim()}>
              Tester
            </Button>
          </div>
          {testError && <p className="mt-2 text-sm text-destructive">{testError}</p>}
          {testResult && (
            <a
              className="mt-2 inline-block text-sm text-primary hover:underline"
              href={testResult.url}
              target="_blank"
              rel="noreferrer"
            >
              {testResult.key} — {testResult.summary} ({testResult.status})
            </a>
          )}
        </div>
      )}
    </Section>
  );
}

export function SettingsPage({
  theme,
  setTheme,
  onHome,
}: {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onHome: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <TopBar onHome={onHome}>
        <button type="button" className={topBarButtonClass} onClick={onHome}>
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Retour</span>
        </button>
      </TopBar>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-5 text-lg font-semibold">Paramètres</h1>
        <div className="flex flex-col gap-4">
          <ThemeSettings theme={theme} setTheme={setTheme} />
          <JiraSettings />
        </div>
      </main>
    </div>
  );
}

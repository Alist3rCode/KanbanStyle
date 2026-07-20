import { useState } from "react";
import { authApi } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.login(username, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-board p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src="/logo.png" alt="KanbanStyle" className="h-16 w-16 rounded-lg" />
          <h1 className="text-2xl font-bold tracking-tight">KanbanStyle</h1>
          <p className="text-sm text-muted-foreground">Connectez-vous pour continuer</p>
        </div>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <input
            className={inputClass}
            placeholder="Utilisateur"
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
            autoFocus
          />
          <input
            className={inputClass}
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-1 w-full">
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
      </div>
    </main>
  );
}

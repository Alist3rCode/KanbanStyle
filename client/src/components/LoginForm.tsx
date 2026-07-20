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

  return (
    <main className="flex min-h-screen w-screen flex-col items-center justify-center gap-4 p-8">
      <div className="flex w-full max-w-sm flex-col items-center gap-2">
        <img src="/logo.png" alt="KanbanStyle" className="h-16 w-16" />
        <h1 className="text-2xl font-semibold">KanbanStyle</h1>
      </div>
      <form className="flex w-full max-w-sm flex-col gap-3" onSubmit={handleSubmit}>
        <input
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Utilisateur"
          value={username}
          onChange={(e) => setUsername(e.currentTarget.value)}
          autoFocus
        />
        <input
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading}>
          Se connecter
        </Button>
      </form>
    </main>
  );
}

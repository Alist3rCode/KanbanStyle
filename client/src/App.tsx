import { useEffect, useState } from "react";
import { authApi } from "@/lib/auth";
import { boardsApi, type Board } from "@/lib/boards";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/LoginForm";
import { SettingsPage } from "@/components/SettingsPage";

function BoardsPage({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    boardsApi.list().then(setBoards);
  }, []);

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    const board = await boardsApi.create(title);
    setBoards((prev) => [...prev, board]);
    setNewTitle("");
  }

  async function handleRename(id: number, title: string) {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, title } : b)));
    await boardsApi.rename(id, title);
  }

  async function handleDelete(id: number) {
    await boardsApi.remove(id);
    setBoards((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">KanbanStyle</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onOpenSettings}>
            Paramètres
          </Button>
          <Button variant="ghost" onClick={() => authApi.logout().then(() => location.reload())}>
            Se déconnecter
          </Button>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        <input
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Nouveau tableau..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button onClick={handleCreate}>Créer</Button>
      </div>

      <ul className="space-y-2">
        {boards.map((board) => (
          <li
            key={board.id}
            className="flex items-center gap-2 rounded-md border border-border p-3"
          >
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              defaultValue={board.title}
              onBlur={(e) => handleRename(board.id, e.currentTarget.value)}
            />
            <Button variant="ghost" onClick={() => handleDelete(board.id)}>
              Supprimer
            </Button>
          </li>
        ))}
        {boards.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun tableau pour le moment.</p>
        )}
      </ul>
    </main>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [view, setView] = useState<"boards" | "settings">("boards");
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    authApi.me().then((res) => setAuthenticated(res.authenticated));
  }, []);

  if (authenticated === null) return null;
  if (!authenticated) {
    return <LoginForm onSuccess={() => setAuthenticated(true)} />;
  }
  if (view === "settings") {
    return <SettingsPage theme={theme} setTheme={setTheme} onBack={() => setView("boards")} />;
  }
  return <BoardsPage onOpenSettings={() => setView("settings")} />;
}

export default App;

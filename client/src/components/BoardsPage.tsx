import { useEffect, useRef, useState } from "react";
import { LogOut, MoreHorizontal, Plus, Settings } from "lucide-react";
import { boardsApi, type Board } from "@/lib/boards";
import { authApi } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { TopBar, topBarButtonClass } from "@/components/TopBar";

// Deterministic Trello-like tile gradients, picked by board id.
const TILE_GRADIENTS = [
  "from-sky-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
];

function BoardTile({
  board,
  onOpen,
  onRename,
  onOpenTemplate,
  onDelete,
}: {
  board: Board;
  onOpen: () => void;
  onRename: (title: string) => void;
  onOpenTemplate: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(board.title);
  const gradient = TILE_GRADIENTS[board.id % TILE_GRADIENTS.length];

  function commitRename() {
    setEditing(false);
    const next = title.trim();
    if (next && next !== board.title) onRename(next);
    else setTitle(board.title);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !editing && onOpen()}
      onKeyDown={(e) => e.key === "Enter" && !editing && onOpen()}
      className={`group relative flex h-24 flex-col justify-between overflow-hidden rounded-lg bg-gradient-to-br ${gradient} p-3 text-left text-white shadow-sm ring-1 ring-black/5 transition hover:shadow-md`}
    >
      {editing ? (
        <input
          autoFocus
          className="w-full rounded bg-white/90 px-2 py-1 text-sm font-semibold text-neutral-900 outline-none"
          value={title}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setTitle(e.currentTarget.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setTitle(board.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <span className="line-clamp-2 pr-6 text-sm font-semibold drop-shadow-sm">
          {board.title}
        </span>
      )}

      <button
        type="button"
        aria-label="Options du tableau"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="absolute right-1.5 top-1.5 rounded p-1 text-white/80 opacity-0 transition hover:bg-white/20 focus-visible:opacity-100 group-hover:opacity-100"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
          <div
            className="absolute right-1.5 top-9 z-20 w-40 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { label: "Renommer", action: () => setEditing(true) },
              { label: "Paramètres du tableau", action: onOpenTemplate },
              { label: "Supprimer", action: onDelete, danger: true },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  item.action();
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent ${
                  item.danger ? "text-destructive" : ""
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function BoardsPage({
  onOpenBoard,
  onOpenTemplate,
  onOpenSettings,
}: {
  onOpenBoard: (board: Board) => void;
  onOpenTemplate: (board: Board) => void;
  onOpenSettings: () => void;
}) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    boardsApi.list().then(setBoards);
  }, []);

  useEffect(() => {
    if (creating) createInputRef.current?.focus();
  }, [creating]);

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) {
      setCreating(false);
      return;
    }
    const board = await boardsApi.create(title);
    setBoards((prev) => [...prev, board]);
    setNewTitle("");
    setCreating(false);
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
    <div className="flex min-h-full flex-col">
      <TopBar>
        <button type="button" className={topBarButtonClass} onClick={onOpenSettings}>
          <Settings className="size-4" />
          <span className="hidden sm:inline">Paramètres</span>
        </button>
        <button
          type="button"
          className={topBarButtonClass}
          onClick={() => authApi.logout().then(() => location.reload())}
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </TopBar>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="mb-5 text-lg font-semibold">Vos tableaux</h1>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {boards.map((board) => (
            <BoardTile
              key={board.id}
              board={board}
              onOpen={() => onOpenBoard(board)}
              onRename={(title) => handleRename(board.id, title)}
              onOpenTemplate={() => onOpenTemplate(board)}
              onDelete={() => handleDelete(board.id)}
            />
          ))}

          {creating ? (
            <div className="flex h-24 flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <input
                ref={createInputRef}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                placeholder="Titre du tableau"
                value={newTitle}
                onChange={(e) => setNewTitle(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    setNewTitle("");
                    setCreating(false);
                  }
                }}
                onBlur={handleCreate}
              />
              <Button size="sm" onClick={handleCreate}>
                Créer
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/40 text-sm font-medium text-muted-foreground transition hover:bg-muted"
            >
              <Plus className="size-5" />
              Créer un tableau
            </button>
          )}
        </div>

        {boards.length === 0 && !creating && (
          <p className="mt-6 text-sm text-muted-foreground">
            Vous n'avez pas encore de tableau. Créez-en un pour commencer.
          </p>
        )}
      </main>
    </div>
  );
}

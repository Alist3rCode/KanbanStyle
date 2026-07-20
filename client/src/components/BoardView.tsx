import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  LogOut,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { columnsApi, type Column } from "@/lib/columns";
import { cardsApi, type Card } from "@/lib/cards";
import { customFieldsApi } from "@/lib/customFields";
import { authApi } from "@/lib/auth";
import { CardEditor } from "@/components/CardEditor";
import { TopBar, topBarButtonClass } from "@/components/TopBar";

interface ColumnWithCards extends Column {
  cards: Card[];
}

function CardItem({ card, onOpen }: { card: Card; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card.id}`,
    data: { type: "card", columnId: card.column_id },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group cursor-pointer rounded-lg border border-border/60 bg-card px-3 py-2 text-sm text-card-foreground shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <p className="whitespace-pre-wrap break-words">{card.title}</p>
      {(card.closed || card.has_attachments) && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {card.closed && (
            <span className="inline-flex items-center rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              Terminé
            </span>
          )}
          {card.has_attachments && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Paperclip className="size-3" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ColumnMenu({
  isClosing,
  onToggleClosing,
  onDelete,
}: {
  isClosing: boolean;
  onToggleClosing: (value: boolean) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Options de la liste"
        onClick={() => setOpen((v) => !v)}
        onPointerDown={(e) => e.stopPropagation()}
        className="rounded p-1 text-list-foreground/70 transition hover:bg-black/10 dark:hover:bg-white/10"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-52 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg">
            <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
              <input
                type="checkbox"
                checked={isClosing}
                onChange={(e) => onToggleClosing(e.currentTarget.checked)}
              />
              Colonne de fermeture
            </label>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-destructive hover:bg-accent"
            >
              Supprimer la liste
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ColumnContainer({
  column,
  visibleCards,
  onRename,
  onToggleClosingRule,
  onDelete,
  onAddCard,
  onOpenCard,
}: {
  column: ColumnWithCards;
  visibleCards: Card[];
  onRename: (title: string) => void;
  onToggleClosingRule: (value: boolean) => void;
  onDelete: () => void;
  onAddCard: (title: string) => void;
  onOpenCard: (card: Card) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `col-${column.id}`,
    data: { type: "column" },
  });
  const [adding, setAdding] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const addRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (adding) addRef.current?.focus();
  }, [adding]);

  function submitCard() {
    const title = newCardTitle.trim();
    if (title) onAddCard(title);
    setNewCardTitle("");
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex max-h-full w-72 shrink-0 snap-start flex-col rounded-xl bg-list text-list-foreground shadow-sm"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex cursor-grab items-center gap-1 px-2 py-2 active:cursor-grabbing"
      >
        <input
          className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm font-semibold outline-none focus-visible:bg-background"
          defaultValue={column.title}
          onBlur={(e) => onRename(e.currentTarget.value)}
          onPointerDown={(e) => e.stopPropagation()}
        />
        {column.is_closing_column && (
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            Fermeture
          </span>
        )}
        <ColumnMenu
          isClosing={column.is_closing_column}
          onToggleClosing={onToggleClosingRule}
          onDelete={onDelete}
        />
      </div>

      <SortableContext
        items={visibleCards.map((c) => `card-${c.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="kb-scroll flex min-h-1.5 flex-col gap-2 overflow-y-auto px-2 pb-1">
          {visibleCards.map((card) => (
            <CardItem key={card.id} card={card} onOpen={() => onOpenCard(card)} />
          ))}
        </div>
      </SortableContext>

      <div className="p-2">
        {adding ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              ref={addRef}
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-card p-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              placeholder="Saisir un titre..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitCard();
                }
                if (e.key === "Escape") {
                  setNewCardTitle("");
                  setAdding(false);
                }
              }}
              onBlur={() => {
                submitCard();
                setAdding(false);
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={submitCard}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Ajouter
              </button>
              <button
                type="button"
                aria-label="Annuler"
                onClick={() => {
                  setNewCardTitle("");
                  setAdding(false);
                }}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-list-foreground/80 transition hover:bg-black/10 dark:hover:bg-white/10"
          >
            <Plus className="size-4" />
            Ajouter une carte
          </button>
        )}
      </div>
    </div>
  );
}

export function BoardView({
  boardId,
  boardTitle,
  onHome,
  onOpenSettings,
}: {
  boardId: number;
  boardTitle: string;
  onHome: () => void;
  onOpenSettings: () => void;
}) {
  const [columns, setColumns] = useState<ColumnWithCards[]>([]);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [search, setSearch] = useState("");
  const [hideClosed, setHideClosed] = useState(false);
  const [onlyWithAttachments, setOnlyWithAttachments] = useState(false);
  const [fieldValuesByCard, setFieldValuesByCard] = useState<Map<number, string[]>>(new Map());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    (async () => {
      const cols = await columnsApi.list(boardId);
      const withCards = await Promise.all(
        cols.map(async (col) => ({ ...col, cards: await cardsApi.list(col.id) })),
      );
      setColumns(withCards);

      const values = await customFieldsApi.fieldValuesForBoard(boardId);
      const byCard = new Map<number, string[]>();
      for (const { card_id, value } of values) {
        byCard.set(card_id, [...(byCard.get(card_id) ?? []), value]);
      }
      setFieldValuesByCard(byCard);
    })();
  }, [boardId]);

  function isCardVisible(card: Card): boolean {
    if (hideClosed && card.closed) return false;
    if (onlyWithAttachments && !card.has_attachments) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    if (card.title.toLowerCase().includes(query)) return true;
    if (card.description.toLowerCase().includes(query)) return true;
    return (fieldValuesByCard.get(card.id) ?? []).some((v) => v.toLowerCase().includes(query));
  }

  async function handleAddColumn() {
    const title = newColumnTitle.trim();
    if (!title) {
      setAddingColumn(false);
      return;
    }
    const column = await columnsApi.create(boardId, title);
    setColumns((prev) => [...prev, { ...column, cards: [] }]);
    setNewColumnTitle("");
  }

  async function handleRenameColumn(id: number, title: string) {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    await columnsApi.rename(id, title);
  }

  async function handleToggleClosingRule(id: number, value: boolean) {
    setColumns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              is_closing_column: value,
              cards: c.cards.map((card) => ({
                ...card,
                closed: value,
                closed_at: value ? new Date().toISOString() : null,
              })),
            }
          : c,
      ),
    );
    await columnsApi.setClosingRule(id, value);
  }

  async function handleDeleteColumn(id: number) {
    setColumns((prev) => prev.filter((c) => c.id !== id));
    await columnsApi.remove(id);
  }

  async function handleAddCard(columnId: number, title: string) {
    const card = await cardsApi.create(columnId, title);
    setColumns((prev) =>
      prev.map((c) => (c.id === columnId ? { ...c, cards: [...c.cards, card] } : c)),
    );
  }

  function findColumnOfCard(cardId: number) {
    return columns.find((c) => c.cards.some((card) => card.id === cardId));
  }

  function handleRenameCard(cardId: number, title: string) {
    setColumns((prev) =>
      prev.map((c) => ({
        ...c,
        cards: c.cards.map((card) => (card.id === cardId ? { ...card, title } : card)),
      })),
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.type === "column") {
      if (over.data.current?.type !== "column" || active.id === over.id) return;
      const activeIndex = columns.findIndex((c) => `col-${c.id}` === active.id);
      const overIndex = columns.findIndex((c) => `col-${c.id}` === over.id);
      const reordered = arrayMove(columns, activeIndex, overIndex);
      setColumns(reordered);
      reordered.forEach((c, i) => columnsApi.reorder(c.id, i));
      return;
    }

    const cardId = Number(String(active.id).replace("card-", ""));
    const sourceColumn = findColumnOfCard(cardId);
    if (!sourceColumn) return;

    let destColumnId: number;
    if (over.data.current?.type === "card") {
      const destCard = findColumnOfCard(Number(String(over.id).replace("card-", "")));
      if (!destCard) return;
      destColumnId = destCard.id;
    } else if (over.data.current?.type === "column") {
      destColumnId = Number(String(over.id).replace("col-", ""));
    } else {
      return;
    }

    const destColumn = columns.find((c) => c.id === destColumnId);
    if (!destColumn) return;

    let destIndex = destColumn.cards.length;
    if (over.data.current?.type === "card") {
      destIndex = destColumn.cards.findIndex(
        (c) => c.id === Number(String(over.id).replace("card-", "")),
      );
    }

    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, cards: [...c.cards] }));
      const src = next.find((c) => c.id === sourceColumn.id)!;
      const cardIndex = src.cards.findIndex((c) => c.id === cardId);
      const [movedCard] = src.cards.splice(cardIndex, 1);
      const dest = next.find((c) => c.id === destColumnId)!;
      movedCard.column_id = dest.id;
      movedCard.closed = dest.is_closing_column;
      movedCard.closed_at = dest.is_closing_column ? new Date().toISOString() : null;
      dest.cards.splice(destIndex, 0, movedCard);
      dest.cards.forEach((c, i) => (c.position = i));
      if (src.id !== dest.id) src.cards.forEach((c, i) => (c.position = i));
      return next;
    });

    await cardsApi.move(cardId, destColumnId, destIndex);
  }

  return (
    <div className="flex h-full flex-col bg-board text-board-foreground">
      <TopBar onHome={onHome}>
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

      {/* Board header strip over the coloured board background */}
      <div className="flex flex-wrap items-center gap-3 bg-black/10 px-4 py-2.5 backdrop-blur-sm">
        <h1 className="mr-1 truncate text-lg font-bold">{boardTitle}</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-board-foreground/60" />
          <input
            className="h-8 w-48 rounded-md border border-white/20 bg-white/15 pl-8 pr-2 text-sm text-board-foreground placeholder:text-board-foreground/60 outline-none focus-visible:bg-white/25 sm:w-64"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-board-foreground/90">
          <input
            type="checkbox"
            checked={hideClosed}
            onChange={(e) => setHideClosed(e.currentTarget.checked)}
          />
          Masquer terminées
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-board-foreground/90">
          <input
            type="checkbox"
            checked={onlyWithAttachments}
            onChange={(e) => setOnlyWithAttachments(e.currentTarget.checked)}
          />
          Avec pièces jointes
        </label>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={columns.map((c) => `col-${c.id}`)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="kb-scroll flex flex-1 snap-x snap-mandatory items-start gap-3 overflow-x-auto p-3 sm:snap-none">
            {columns.map((column) => (
              <ColumnContainer
                key={column.id}
                column={column}
                visibleCards={column.cards.filter(isCardVisible)}
                onRename={(title) => handleRenameColumn(column.id, title)}
                onToggleClosingRule={(value) => handleToggleClosingRule(column.id, value)}
                onDelete={() => handleDeleteColumn(column.id)}
                onAddCard={(title) => handleAddCard(column.id, title)}
                onOpenCard={setEditingCard}
              />
            ))}

            <div className="w-72 shrink-0 snap-start">
              {addingColumn ? (
                <div className="flex flex-col gap-1.5 rounded-xl bg-list p-2 shadow-sm">
                  <input
                    autoFocus
                    className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    placeholder="Titre de la liste"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn();
                      if (e.key === "Escape") {
                        setNewColumnTitle("");
                        setAddingColumn(false);
                      }
                    }}
                    onBlur={handleAddColumn}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleAddColumn}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Ajouter
                    </button>
                    <button
                      type="button"
                      aria-label="Annuler"
                      onClick={() => {
                        setNewColumnTitle("");
                        setAddingColumn(false);
                      }}
                      className="rounded-md p-1.5 text-list-foreground/70 hover:bg-black/10 dark:hover:bg-white/10"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingColumn(true)}
                  className="flex w-full items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2.5 text-sm font-medium text-board-foreground transition hover:bg-white/25"
                >
                  <Plus className="size-4" />
                  Ajouter une liste
                </button>
              )}
            </div>
          </div>
        </SortableContext>
      </DndContext>

      {editingCard && (
        <CardEditor
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onRename={(title) => handleRenameCard(editingCard.id, title)}
        />
      )}
    </div>
  );
}

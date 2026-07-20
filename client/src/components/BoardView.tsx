import { useEffect, useState } from "react";
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
import { columnsApi, type Column } from "@/lib/columns";
import { cardsApi, type Card } from "@/lib/cards";
import { Button } from "@/components/ui/button";

interface ColumnWithCards extends Column {
  cards: Card[];
}

function CardItem({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card.id}`,
    data: { type: "card", columnId: card.column_id },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="cursor-grab rounded-md border border-border bg-card p-2 text-sm active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-2">
        <span>{card.title}</span>
        {card.closed && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            Terminé
          </span>
        )}
      </div>
    </div>
  );
}

function ColumnContainer({
  column,
  onRename,
  onToggleClosingRule,
  onDelete,
  onAddCard,
}: {
  column: ColumnWithCards;
  onRename: (title: string) => void;
  onToggleClosingRule: (value: boolean) => void;
  onDelete: () => void;
  onAddCard: (title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `col-${column.id}`,
    data: { type: "column" },
  });
  const [newCardTitle, setNewCardTitle] = useState("");

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex w-72 shrink-0 flex-col gap-2 rounded-md border border-border bg-muted/30 p-2"
    >
      <div {...attributes} {...listeners} className="flex cursor-grab items-center gap-2 active:cursor-grabbing">
        <input
          className="flex-1 bg-transparent text-sm font-medium outline-none"
          defaultValue={column.title}
          onBlur={(e) => onRename(e.currentTarget.value)}
          onPointerDown={(e) => e.stopPropagation()}
        />
        <Button variant="ghost" size="icon" onClick={onDelete}>
          ✕
        </Button>
      </div>

      <label className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={column.is_closing_column}
          onChange={(e) => onToggleClosingRule(e.currentTarget.checked)}
        />
        Colonne de fermeture
      </label>

      <SortableContext
        items={column.cards.map((c) => `card-${c.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-8 flex-col gap-2">
          {column.cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>

      <div className="flex gap-1">
        <input
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
          placeholder="Nouvelle carte..."
          value={newCardTitle}
          onChange={(e) => setNewCardTitle(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newCardTitle.trim()) {
              onAddCard(newCardTitle.trim());
              setNewCardTitle("");
            }
          }}
        />
      </div>
    </div>
  );
}

export function BoardView({ boardId, boardTitle, onBack }: { boardId: number; boardTitle: string; onBack: () => void }) {
  const [columns, setColumns] = useState<ColumnWithCards[]>([]);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    (async () => {
      const cols = await columnsApi.list(boardId);
      const withCards = await Promise.all(
        cols.map(async (col) => ({ ...col, cards: await cardsApi.list(col.id) })),
      );
      setColumns(withCards);
    })();
  }, [boardId]);

  async function handleAddColumn() {
    const title = newColumnTitle.trim();
    if (!title) return;
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
    <main className="flex h-full flex-col p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{boardTitle}</h1>
        <Button variant="ghost" onClick={onBack}>
          Retour
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={columns.map((c) => `col-${c.id}`)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
            {columns.map((column) => (
              <ColumnContainer
                key={column.id}
                column={column}
                onRename={(title) => handleRenameColumn(column.id, title)}
                onToggleClosingRule={(value) => handleToggleClosingRule(column.id, value)}
                onDelete={() => handleDeleteColumn(column.id)}
                onAddCard={(title) => handleAddCard(column.id, title)}
              />
            ))}

            <div className="flex w-72 shrink-0 gap-1">
              <input
                className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                placeholder="Nouvelle colonne..."
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
              />
              <Button onClick={handleAddColumn}>Ajouter</Button>
            </div>
          </div>
        </SortableContext>
      </DndContext>
    </main>
  );
}

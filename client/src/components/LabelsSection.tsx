import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { labelsApi, LABEL_COLORS, LABEL_COLOR_CLASSES, type Label, type LabelColor } from "@/lib/labels";
import { Button } from "@/components/ui/button";

function ColorPicker({
  value,
  onChange,
}: {
  value: LabelColor;
  onChange: (color: LabelColor) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {LABEL_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          onClick={() => onChange(color)}
          className={`size-6 rounded-full ${LABEL_COLOR_CLASSES[color]} ${
            value === color ? "ring-2 ring-offset-2 ring-ring" : ""
          }`}
        />
      ))}
    </div>
  );
}

export function LabelsSection({ boardId }: { boardId: number }) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>(LABEL_COLORS[0]);

  useEffect(() => {
    labelsApi.list(boardId).then(setLabels);
  }, [boardId]);

  async function handleAdd() {
    const label = await labelsApi.create(boardId, name.trim(), color);
    setLabels((prev) => [...prev, label]);
    setName("");
  }

  async function handleRename(id: number, next: string) {
    setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, name: next } : l)));
    await labelsApi.rename(id, next);
  }

  async function handleColorChange(id: number, next: LabelColor) {
    setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, color: next } : l)));
    await labelsApi.setColor(id, next);
  }

  async function handleDelete(id: number) {
    await labelsApi.remove(id);
    setLabels((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold">Étiquettes</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Ajoutées aux cartes de ce tableau, elles apparaissent en pastilles colorées et permettent
        de filtrer le tableau.
      </p>

      <ul className="mb-4 space-y-2">
        {labels.map((label) => (
          <li
            key={label.id}
            className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center"
          >
            <span className={`size-4 shrink-0 rounded-full ${LABEL_COLOR_CLASSES[label.color]}`} />
            <input
              className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              placeholder="Nom (optionnel)"
              defaultValue={label.name}
              onBlur={(e) => handleRename(label.id, e.currentTarget.value)}
            />
            <ColorPicker value={label.color} onChange={(c) => handleColorChange(label.id, c)} />
            <button
              type="button"
              aria-label="Supprimer l'étiquette"
              onClick={() => handleDelete(label.id)}
              className="self-end rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-destructive sm:self-auto"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
        {labels.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune étiquette pour l'instant.</p>
        )}
      </ul>

      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
        <p className="text-sm font-semibold">Ajouter une étiquette</p>
        <input
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          placeholder="Nom (optionnel)"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <ColorPicker value={color} onChange={setColor} />
        <div>
          <Button onClick={handleAdd}>Ajouter</Button>
        </div>
      </div>
    </section>
  );
}

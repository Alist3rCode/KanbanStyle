import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
  customFieldsApi,
  FIELD_TYPE_LABELS,
  type CustomField,
  type FieldType,
} from "@/lib/customFields";
import { Button } from "@/components/ui/button";
import { TopBar, topBarButtonClass } from "@/components/TopBar";

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];

export function BoardTemplatePage({
  boardId,
  boardTitle,
  onHome,
}: {
  boardId: number;
  boardTitle: string;
  onHome: () => void;
}) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [linkPrefix, setLinkPrefix] = useState("");

  useEffect(() => {
    customFieldsApi.list(boardId).then(setFields);
  }, [boardId]);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const field = await customFieldsApi.create(
      boardId,
      trimmed,
      fieldType,
      fieldType === "link" ? linkPrefix.trim() : undefined,
    );
    setFields((prev) => [...prev, field]);
    setName("");
    setLinkPrefix("");
  }

  async function handleDelete(id: number) {
    await customFieldsApi.remove(id);
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const reordered = [...fields];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setFields(reordered);
    await Promise.all(
      reordered.map((field, position) => customFieldsApi.reorder(field.id, position)),
    );
  }

  const inputClass =
    "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <div className="flex min-h-full flex-col">
      <TopBar onHome={onHome}>
        <button type="button" className={topBarButtonClass} onClick={onHome}>
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Retour</span>
        </button>
      </TopBar>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-lg font-semibold">Modèle de tâche</h1>
        <p className="mb-5 text-sm text-muted-foreground">{boardTitle}</p>

        <ul className="mb-4 space-y-2">
          {fields.map((field, index) => (
            <li
              key={field.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 shadow-sm"
            >
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{field.name}</span>
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {FIELD_TYPE_LABELS[field.field_type]}
                </span>
                {field.link_prefix && (
                  <span className="truncate text-xs text-muted-foreground">
                    {field.link_prefix}
                    {"{{suffixe}}"}
                  </span>
                )}
              </div>
              <button
                type="button"
                aria-label="Monter"
                onClick={() => handleMove(index, -1)}
                disabled={index === 0}
                className="rounded p-1 text-muted-foreground transition hover:bg-accent disabled:opacity-30"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Descendre"
                onClick={() => handleMove(index, 1)}
                disabled={index === fields.length - 1}
                className="rounded p-1 text-muted-foreground transition hover:bg-accent disabled:opacity-30"
              >
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Supprimer le champ"
                onClick={() => handleDelete(field.id)}
                className="rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun champ dans ce modèle pour l'instant.
            </p>
          )}
        </ul>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold">Ajouter un champ</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className={`flex-1 ${inputClass}`}
              placeholder="Nom du champ"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <select
              className={inputClass}
              value={fieldType}
              onChange={(e) => setFieldType(e.currentTarget.value as FieldType)}
            >
              {FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {FIELD_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          {fieldType === "link" && (
            <input
              className={inputClass}
              placeholder="Préfixe d'URL, ex: https://entreprise.atlassian.net/browse/"
              value={linkPrefix}
              onChange={(e) => setLinkPrefix(e.currentTarget.value)}
            />
          )}
          <div>
            <Button onClick={handleAdd}>Ajouter</Button>
          </div>
        </div>
      </main>
    </div>
  );
}

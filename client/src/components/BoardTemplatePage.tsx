import { useEffect, useState } from "react";
import {
  customFieldsApi,
  FIELD_TYPE_LABELS,
  type CustomField,
  type FieldType,
} from "@/lib/customFields";
import { Button } from "@/components/ui/button";

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];

export function BoardTemplatePage({
  boardId,
  boardTitle,
  onBack,
}: {
  boardId: number;
  boardTitle: string;
  onBack: () => void;
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

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Modèle — {boardTitle}</h1>
        <Button variant="ghost" onClick={onBack}>
          Retour
        </Button>
      </div>

      <ul className="mb-6 space-y-2">
        {fields.map((field, index) => (
          <li
            key={field.id}
            className="flex items-center gap-2 rounded-md border border-border p-3"
          >
            <div className="flex flex-1 items-center gap-2">
              <span className="text-sm font-medium">{field.name}</span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {FIELD_TYPE_LABELS[field.field_type]}
              </span>
              {field.link_prefix && (
                <span className="text-xs text-muted-foreground">{field.link_prefix}{"{{suffix}}"}</span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleMove(index, -1)} disabled={index === 0}>
              ↑
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMove(index, 1)}
              disabled={index === fields.length - 1}
            >
              ↓
            </Button>
            <Button variant="ghost" onClick={() => handleDelete(field.id)}>
              Supprimer
            </Button>
          </li>
        ))}
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun champ dans ce modèle pour l'instant.</p>
        )}
      </ul>

      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <p className="text-sm font-medium text-muted-foreground">Ajouter un champ</p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Nom du champ"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Préfixe d'URL, ex: https://entreprise.atlassian.net/browse/"
            value={linkPrefix}
            onChange={(e) => setLinkPrefix(e.currentTarget.value)}
          />
        )}
        <Button onClick={handleAdd}>Ajouter</Button>
      </div>
    </main>
  );
}

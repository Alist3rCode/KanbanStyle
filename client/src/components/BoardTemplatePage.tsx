import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
  customFieldsApi,
  FIELD_TYPE_LABELS,
  SHOW_ON_CARD_LABELS,
  type CustomField,
  type FieldType,
  type ShowOnCard,
} from "@/lib/customFields";
import { Button } from "@/components/ui/button";
import { TopBar, topBarButtonClass } from "@/components/TopBar";
import { ShowOnCardToggle } from "@/components/ShowOnCardToggle";
import { LabelsSection } from "@/components/LabelsSection";

const SHOW_ON_CARD_VALUES = Object.keys(SHOW_ON_CARD_LABELS) as ShowOnCard[];

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];

export function BoardTemplatePage({
  boardId,
  boardTitle,
  onHome,
  onBack,
}: {
  boardId: number;
  boardTitle: string;
  onHome: () => void;
  onBack: () => void;
}) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [linkPrefix, setLinkPrefix] = useState("");
  const [defaultValue, setDefaultValue] = useState("");
  const [showOnCard, setShowOnCard] = useState<ShowOnCard>("never");

  useEffect(() => {
    customFieldsApi.list(boardId).then(setFields);
  }, [boardId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const field = await customFieldsApi.create(
      boardId,
      trimmed,
      fieldType,
      fieldType === "link" ? linkPrefix.trim() : undefined,
      defaultValue.trim(),
      showOnCard,
    );
    setFields((prev) => [...prev, field]);
    setName("");
    setLinkPrefix("");
    setDefaultValue("");
    setShowOnCard("never");
  }

  async function handleDelete(id: number) {
    await customFieldsApi.remove(id);
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleDefaultValueChange(id: number, value: string) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, default_value: value } : f)));
    await customFieldsApi.setDefaultValue(id, value);
  }

  async function handleShowOnCardChange(id: number, value: ShowOnCard) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, show_on_card: value } : f)));
    await customFieldsApi.setShowOnCard(id, value);
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
        <button type="button" className={topBarButtonClass} onClick={onBack}>
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Retour</span>
        </button>
      </TopBar>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-lg font-semibold">Paramètres du tableau</h1>
        <p className="mb-5 text-sm text-muted-foreground">{boardTitle}</p>

        <div className="mb-4">
          <LabelsSection boardId={boardId} />
        </div>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold">Modèle de tâche</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Ces champs sont automatiquement ajoutés à chaque nouvelle carte de ce tableau, avec
            leur valeur par défaut pré-remplie.
          </p>

          <ul className="mb-4 space-y-2">
            {fields.map((field, index) => (
              <li
                key={field.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center"
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
                <input
                  className={`w-full sm:w-48 ${inputClass}`}
                  placeholder="Valeur par défaut"
                  defaultValue={field.default_value}
                  onBlur={(e) => handleDefaultValueChange(field.id, e.currentTarget.value)}
                />
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <ShowOnCardToggle
                    value={field.show_on_card}
                    onChange={(value) => handleShowOnCardChange(field.id, value)}
                  />
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
                </div>
              </li>
            ))}
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun champ dans ce modèle pour l'instant.
              </p>
            )}
          </ul>

          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
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
            <input
              className={inputClass}
              placeholder="Valeur par défaut (optionnel)"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.currentTarget.value)}
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Aperçu sur la carte dans le tableau :
              <select
                className={inputClass}
                value={showOnCard}
                onChange={(e) => setShowOnCard(e.currentTarget.value as ShowOnCard)}
              >
                {SHOW_ON_CARD_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {SHOW_ON_CARD_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <Button onClick={handleAdd}>Ajouter</Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

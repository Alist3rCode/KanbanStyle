import { useEffect, useRef, useState } from "react";
import {
  AlignLeft,
  Calendar,
  Clock,
  Code,
  CreditCard,
  LayoutList,
  Link2,
  Paperclip,
  Plus,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cardsApi, type Card } from "@/lib/cards";
import { attachmentsApi, type Attachment } from "@/lib/attachments";
import { jiraApi } from "@/lib/jira";
import {
  customFieldsApi,
  FIELD_TYPE_LABELS,
  type CardFieldValue,
  type FieldType,
  type ShowOnCard,
} from "@/lib/customFields";
import {
  labelsApi,
  LABEL_COLORS,
  LABEL_COLOR_CLASSES,
  type CardLabelOption,
  type LabelColor,
} from "@/lib/labels";
import { GRADIENT_COVERS, coverClasses } from "@/lib/covers";
import { ShowOnCardToggle } from "@/components/ShowOnCardToggle";
import { parseChecklist, serializeChecklist, type ChecklistItem } from "@/lib/checklist";
import { useClickOutside } from "@/hooks/useClickOutside";

function CoverMenuButton({
  coverColor,
  hasCover,
  onPickColor,
  onUploadImage,
  onRemove,
}: {
  coverColor: string | null;
  hasCover: boolean;
  onPickColor: (color: string) => void;
  onUploadImage: (file: File) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useClickOutside(containerRef, () => setOpen(false), open);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
      >
        <CreditCard className="size-3.5" />
        Couverture
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-20 w-64 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Couleurs</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {LABEL_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                onClick={() => onPickColor(color)}
                className={`h-7 w-9 rounded ${LABEL_COLOR_CLASSES[color]} ${
                  coverColor === color ? "ring-2 ring-offset-2 ring-ring" : ""
                }`}
              />
            ))}
          </div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Dégradés</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {GRADIENT_COVERS.map((gradient) => (
              <button
                key={gradient.id}
                type="button"
                aria-label={gradient.label}
                title={gradient.label}
                onClick={() => onPickColor(gradient.id)}
                className={`h-7 w-9 rounded ${gradient.classes} ${
                  coverColor === gradient.id ? "ring-2 ring-offset-2 ring-ring" : ""
                }`}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1.5 border-t border-border pt-2.5 text-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-left text-primary hover:underline"
            >
              Importer une image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) onUploadImage(file);
                e.currentTarget.value = "";
              }}
            />
            {hasCover && (
              <button
                type="button"
                onClick={onRemove}
                className="text-left text-muted-foreground hover:underline"
              >
                Retirer la couverture
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LabelsSection({
  cardId,
  boardId,
  onLabelsChange,
}: {
  cardId: number;
  boardId: number;
  onLabelsChange: (labels: { id: number; name: string; color: string }[]) => void;
}) {
  const [labels, setLabels] = useState<CardLabelOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<LabelColor>(LABEL_COLORS[0]);

  useEffect(() => {
    labelsApi.optionsForCard(cardId).then(setLabels);
  }, [cardId]);

  useEffect(() => {
    onLabelsChange(labels.filter((l) => l.attached));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels]);

  async function toggle(label: CardLabelOption) {
    setLabels((prev) =>
      prev.map((l) => (l.id === label.id ? { ...l, attached: !l.attached } : l)),
    );
    if (label.attached) {
      await labelsApi.detach(cardId, label.id);
    } else {
      await labelsApi.attach(cardId, label.id);
    }
  }

  async function handleCreate() {
    const label = await labelsApi.create(boardId, newName.trim(), newColor);
    await labelsApi.attach(cardId, label.id);
    setLabels((prev) => [...prev, { ...label, attached: true }]);
    setNewName("");
    setNewColor(LABEL_COLORS[0]);
    setCreating(false);
  }

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Tag className="size-4 text-muted-foreground" />
        Étiquettes
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {labels.map((label) => (
          <button
            key={label.id}
            type="button"
            onClick={() => toggle(label)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white transition ${
              LABEL_COLOR_CLASSES[label.color]
            } ${label.attached ? "" : "opacity-30 hover:opacity-60"}`}
          >
            {label.name || <span className="italic opacity-80">sans nom</span>}
          </button>
        ))}
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-accent"
          >
            <Plus className="size-3.5" />
            Créer
          </button>
        )}
      </div>
      {creating && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border p-2.5">
          <input
            autoFocus
            className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            placeholder="Nom (optionnel)"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <div className="flex flex-wrap gap-1.5">
            {LABEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setNewColor(c)}
                className={`size-6 rounded-full ${LABEL_COLOR_CLASSES[c]} ${
                  newColor === c ? "ring-2 ring-offset-2 ring-ring" : ""
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Créer et attacher
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function CustomFieldInput({
  field,
  value,
  onChange,
  onCommit,
}: {
  field: CardFieldValue;
  value: string;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
}) {
  const inputClass =
    "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

  if (field.field_type === "date") {
    return (
      <input
        type="date"
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        onBlur={(e) => onCommit(e.currentTarget.value)}
      />
    );
  }

  if (field.field_type === "checklist") {
    return (
      <ChecklistEditor
        value={value}
        onChange={(next) => {
          onChange(next);
          onCommit(next);
        }}
      />
    );
  }

  if (field.field_type === "link") {
    const fullUrl = field.link_prefix ? `${field.link_prefix}${value}` : value;
    return (
      <div className="flex flex-col gap-1">
        <input
          type="text"
          className={inputClass}
          placeholder={field.link_prefix ? "Suffixe (ex: id du ticket)" : "https://..."}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          onBlur={(e) => onCommit(e.currentTarget.value)}
        />
        {value && (
          <a
            href={fullUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs text-primary hover:underline"
          >
            {fullUrl}
          </a>
        )}
      </div>
    );
  }

  return (
    <input
      type="text"
      className={inputClass}
      placeholder={field.field_type === "jira_link" ? "Clé du ticket, ex: PROJ-123" : undefined}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      onBlur={(e) => onCommit(e.currentTarget.value)}
    />
  );
}

function ChecklistEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const items = parseChecklist(value);
  const [newItemText, setNewItemText] = useState("");
  const done = items.filter((item) => item.done).length;

  function update(next: ChecklistItem[]) {
    onChange(serializeChecklist(next));
  }

  function toggleDone(index: number) {
    update(items.map((item, i) => (i === index ? { ...item, done: !item.done } : item)));
  }

  function removeItem(index: number) {
    update(items.filter((_, i) => i !== index));
  }

  function addItem() {
    const text = newItemText.trim();
    if (!text) return;
    update([...items, { text, done: false }]);
    setNewItemText("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      {items.length > 0 && (
        <>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(done / items.length) * 100}%` }}
            />
          </div>
          <ul className="flex flex-col gap-1">
            {items.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleDone(index)}
                  className="size-3.5 shrink-0 accent-primary"
                />
                <span
                  className={`flex-1 truncate text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}
                >
                  {item.text}
                </span>
                <button
                  type="button"
                  aria-label="Supprimer l'élément"
                  onClick={() => removeItem(index)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="flex gap-1.5">
        <input
          type="text"
          className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          placeholder="Ajouter un élément"
          value={newItemText}
          onChange={(e) => setNewItemText(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <button
          type="button"
          onClick={addItem}
          className="shrink-0 rounded-md px-2 text-xs font-medium text-primary hover:bg-accent"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];

function CustomFieldsSection({ cardId }: { cardId: number }) {
  const [fields, setFields] = useState<CardFieldValue[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newLinkPrefix, setNewLinkPrefix] = useState("");

  useEffect(() => {
    customFieldsApi.valuesForCard(cardId).then(setFields);
  }, [cardId]);

  function handleChange(customFieldId: number, value: string) {
    setFields((prev) =>
      prev.map((f) => (f.custom_field_id === customFieldId ? { ...f, value } : f)),
    );
  }

  function handleCommit(customFieldId: number, value: string) {
    void customFieldsApi.setValueForCard(cardId, customFieldId, value);
  }

  function handleShowOnCardChange(customFieldId: number, value: ShowOnCard) {
    setFields((prev) =>
      prev.map((f) => (f.custom_field_id === customFieldId ? { ...f, show_on_card: value } : f)),
    );
    void customFieldsApi.setShowOnCard(customFieldId, value);
  }

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const field = await customFieldsApi.createForCard(
      cardId,
      trimmed,
      newType,
      newType === "link" ? newLinkPrefix.trim() : undefined,
    );
    setFields((prev) => [...prev, field]);
    setNewName("");
    setNewLinkPrefix("");
    setCreating(false);
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <LayoutList className="size-4 text-muted-foreground" />
        Champs personnalisés
      </div>
      {fields.length > 0 && (
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.custom_field_id}>
              <div className="mb-1 flex items-center gap-1.5">
                <label className="block text-xs font-medium text-muted-foreground">
                  {field.name}
                </label>
                <ShowOnCardToggle
                  value={field.show_on_card}
                  onChange={(value) => handleShowOnCardChange(field.custom_field_id, value)}
                  size="size-3.5"
                />
              </div>
              <CustomFieldInput
                field={field}
                value={field.value}
                onChange={(value) => handleChange(field.custom_field_id, value)}
                onCommit={(value) => handleCommit(field.custom_field_id, value)}
              />
            </div>
          ))}
        </div>
      )}

      {creating ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              autoFocus
              className={`flex-1 ${inputClass}`}
              placeholder="Nom du champ"
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <select
              className={inputClass}
              value={newType}
              onChange={(e) => setNewType(e.currentTarget.value as FieldType)}
            >
              {FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {FIELD_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          {newType === "link" && (
            <input
              className={inputClass}
              placeholder="Préfixe d'URL, ex: https://entreprise.atlassian.net/browse/"
              value={newLinkPrefix}
              onChange={(e) => setNewLinkPrefix(e.currentTarget.value)}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Ce champ sera propre à cette carte uniquement, sans effet sur les autres cartes du
            tableau.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Ajouter
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent"
        >
          <Plus className="size-3.5" />
          Ajouter un champ
        </button>
      )}
    </section>
  );
}

export function CardEditor({
  card,
  boardId,
  onClose,
  onRename,
  onDueDateChange,
  onCoverChange,
  onLabelsChange,
}: {
  card: Card;
  boardId: number;
  onClose: () => void;
  onRename: (title: string) => void;
  onDueDateChange: (dueDate: string | null) => void;
  onCoverChange: (cover: { cover_color: string | null; cover_image: string | null }) => void;
  onLabelsChange: (labels: { id: number; name: string; color: string }[]) => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [dueDate, setDueDate] = useState(card.due_date ?? "");
  const [coverColor, setCoverColor] = useState(card.cover_color);
  const [coverImage, setCoverImage] = useState(card.cover_image);
  const [slashOpen, setSlashOpen] = useState(false);
  const [jiraError, setJiraError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    attachmentsApi.list(card.id).then(setAttachments);
  }, [card.id]);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !slashOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slashOpen, onClose]);

  function saveDescription(value: string) {
    void cardsApi.updateDescription(card.id, value);
  }

  function handleDueDateChange(value: string) {
    setDueDate(value);
    void cardsApi.setDueDate(card.id, value || null);
    onDueDateChange(value || null);
  }

  function handleCoverColorChange(color: string) {
    setCoverColor(color);
    setCoverImage(null);
    void cardsApi.setCoverColor(card.id, color);
    onCoverChange({ cover_color: color, cover_image: null });
  }

  async function handleCoverImageUpload(file: File) {
    const { cover_image } = await cardsApi.setCoverImage(card.id, file);
    setCoverImage(cover_image);
    setCoverColor(null);
    onCoverChange({ cover_color: null, cover_image });
  }

  async function handleRemoveCover() {
    if (coverImage) {
      await cardsApi.removeCoverImage(card.id);
    } else if (coverColor) {
      await cardsApi.setCoverColor(card.id, null);
    }
    setCoverColor(null);
    setCoverImage(null);
    onCoverChange({ cover_color: null, cover_image: null });
  }

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.currentTarget.value;
    const cursor = e.currentTarget.selectionStart;
    setDescription(value);
    const justTypedSlash = value[cursor - 1] === "/";
    const charBefore = value[cursor - 2];
    setSlashOpen(justTypedSlash && (charBefore === undefined || /\s/.test(charBefore)));
  }

  function insertAtCursor(insertText: string, caretOffsetFromEnd = 0) {
    const el = textareaRef.current;
    const cursor = el ? el.selectionStart : description.length;
    const before = description.slice(0, cursor - 1); // drop the triggering "/"
    const after = description.slice(cursor);
    const next = before + insertText + after;
    setDescription(next);
    setSlashOpen(false);
    saveDescription(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = before.length + insertText.length - caretOffsetFromEnd;
      el.setSelectionRange(pos, pos);
    });
  }

  async function handleSlashJira() {
    const key = window.prompt("Clé du ticket Jira (ex: PROJ-123) ?");
    if (!key?.trim()) {
      setSlashOpen(false);
      return;
    }
    setJiraError(null);
    try {
      const issue = await jiraApi.getIssue(key.trim());
      insertAtCursor(`[${issue.key}: ${issue.summary}](${issue.url}) `);
    } catch (err) {
      setJiraError(err instanceof Error ? err.message : "Erreur Jira");
      setSlashOpen(false);
    }
  }

  async function handleUpload(file: File) {
    const attachment = await attachmentsApi.upload(card.id, file);
    setAttachments((prev) => [...prev, attachment]);
  }

  async function handleDeleteAttachment(id: number) {
    await attachmentsApi.remove(id);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  const slashItems = [
    {
      icon: Calendar,
      label: "Date du jour",
      action: () => insertAtCursor(new Date().toLocaleDateString("fr-FR")),
    },
    { icon: Link2, label: "Lien Jira", action: handleSlashJira },
    { icon: Code, label: "Bloc de code", action: () => insertAtCursor("\n```\n\n```\n", 4) },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-start sm:p-6 sm:pt-16"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl border border-border bg-card text-card-foreground shadow-xl sm:max-h-[85vh] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-2 border-b border-border px-4 py-3">
          <CreditCard className="mt-1.5 size-5 shrink-0 text-muted-foreground" />
          <textarea
            ref={titleRef}
            rows={1}
            className="mt-0.5 flex-1 resize-none overflow-hidden bg-transparent text-lg font-semibold outline-none"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            onBlur={() => {
              const next = title.trim();
              if (next && next !== card.title) {
                void cardsApi.rename(card.id, next);
                onRename(next);
              } else {
                setTitle(card.title);
              }
            }}
          />
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent"
          >
            <X className="size-5" />
          </button>
        </div>

        {coverImage ? (
          <img
            src={cardsApi.coverImageUrl(card.id, coverImage)}
            alt=""
            className="h-36 w-full shrink-0 object-cover"
          />
        ) : (
          coverColor && <div className={`h-16 w-full shrink-0 ${coverClasses(coverColor)}`} />
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-4">
            <CoverMenuButton
              coverColor={coverColor}
              hasCover={Boolean(coverColor || coverImage)}
              onPickColor={handleCoverColorChange}
              onUploadImage={handleCoverImageUpload}
              onRemove={handleRemoveCover}
            />
          </div>

          <LabelsSection cardId={card.id} boardId={boardId} onLabelsChange={onLabelsChange} />

          <section className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-muted-foreground" />
              Date d'échéance
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.currentTarget.value)}
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => handleDueDateChange("")}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Supprimer
                </button>
              )}
            </div>
          </section>

          <CustomFieldsSection cardId={card.id} />

          <section className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <AlignLeft className="size-4 text-muted-foreground" />
              Description
            </div>
            <div className="relative">
              <textarea
                ref={textareaRef}
                className="min-h-32 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                placeholder="Ajouter une description... tapez / pour insérer une date, un lien Jira ou un bloc de code"
                value={description}
                onChange={handleDescriptionChange}
                onBlur={(e) => saveDescription(e.currentTarget.value)}
              />
              {slashOpen && (
                <div className="absolute left-2 top-full z-10 mt-1 flex w-56 flex-col gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg">
                  {slashItems.map(({ icon: Icon, label, action }) => (
                    <button
                      key={label}
                      type="button"
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={action}
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {jiraError && <p className="mt-2 text-sm text-destructive">{jiraError}</p>}
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Paperclip className="size-4 text-muted-foreground" />
              Pièces jointes
            </div>
            <div
              className={`mb-3 flex flex-col items-center gap-1 rounded-lg border border-dashed p-4 text-center text-sm transition ${
                dragOver ? "border-primary bg-primary/5" : "border-border text-muted-foreground"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) void handleUpload(file);
              }}
            >
              <Upload className="size-5 text-muted-foreground" />
              <span>
                Glissez-déposez un fichier, ou{" "}
                <label className="cursor-pointer font-medium text-primary hover:underline">
                  parcourir
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      if (file) void handleUpload(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </span>
            </div>
            <ul className="space-y-1.5">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  title="Double-cliquer pour ouvrir"
                  className="group flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition hover:bg-accent"
                  onDoubleClick={() =>
                    window.open(attachmentsApi.fileUrl(a.id), "_blank", "noopener")
                  }
                >
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{a.file_name}</span>
                  <button
                    type="button"
                    aria-label="Supprimer la pièce jointe"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteAttachment(a.id);
                    }}
                    className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-background hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
              {attachments.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucune pièce jointe.</p>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

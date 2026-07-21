import { useEffect, useRef, useState } from "react";
import {
  AlignLeft,
  ArrowLeftRight,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  Code,
  Folder,
  History,
  Image,
  Link2,
  MoreHorizontal,
  Paperclip,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cardsApi, dueStatus, type Card } from "@/lib/cards";
import { attachmentsApi, type Attachment } from "@/lib/attachments";
import { activityApi, type CardActivity } from "@/lib/activity";
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
  LABEL_TEXT_CLASSES,
  type CardLabelOption,
  type LabelColor,
} from "@/lib/labels";
import { GRADIENT_COVERS, coverClasses } from "@/lib/covers";
import { ShowOnCardToggle } from "@/components/ShowOnCardToggle";
import { parseChecklist, serializeChecklist, type ChecklistItem } from "@/lib/checklist";
import { useClickOutside } from "@/hooks/useClickOutside";

const pillClass =
  "flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground transition hover:bg-accent/70";

/** What single popover, if any, is currently open in the quick-action row — only one at a time. */
type PopoverKind = "labels" | "dates" | "customField" | null;

function StatusBadgeButton({
  columns,
  currentColumnId,
  onMove,
}: {
  columns: { id: number; title: string; color: string | null }[];
  currentColumnId: number;
  onMove: (columnId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false), open);
  const current = columns.find((c) => c.id === currentColumnId);
  const colorClass = current?.color
    ? `${LABEL_COLOR_CLASSES[current.color as keyof typeof LABEL_COLOR_CLASSES]} ${LABEL_TEXT_CLASSES[current.color as keyof typeof LABEL_TEXT_CLASSES]}`
    : "bg-muted";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-medium transition hover:opacity-90 ${colorClass}`}
      >
        {current?.title ?? "…"}
        <ChevronDown className="size-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-20 w-52 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
          {columns.map((column) => (
            <button
              key={column.id}
              type="button"
              onClick={() => {
                onMove(column.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <span
                className={`size-3 shrink-0 rounded-full ${
                  column.color
                    ? LABEL_COLOR_CLASSES[column.color as keyof typeof LABEL_COLOR_CLASSES]
                    : "border border-dashed border-muted-foreground/40"
                }`}
              />
              <span className="flex-1 truncate">{column.title}</span>
              {column.id === currentColumnId && <Check className="size-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CardMenuButton({ onRequestDelete }: { onRequestDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false), open);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Menu de la carte"
        title="Menu de la carte"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent"
      >
        <MoreHorizontal className="size-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-52 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRequestDelete();
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-destructive hover:bg-accent"
          >
            <Trash2 className="size-4" />
            Supprimer la carte
          </button>
        </div>
      )}
    </div>
  );
}

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
        aria-label="Couverture"
        title="Couverture"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent"
      >
        <Image className="size-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-64 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg">
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

/** Popover content shared by the "Étiquettes" pill and (indirectly) the "+ Ajouter" menu. */
function LabelsPopoverContent({
  labels,
  onToggle,
  onCreate,
}: {
  labels: CardLabelOption[];
  onToggle: (label: CardLabelOption) => void;
  onCreate: (name: string, color: LabelColor) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<LabelColor>(LABEL_COLORS[0]);

  function handleCreate() {
    onCreate(newName.trim(), newColor);
    setNewName("");
    setNewColor(LABEL_COLORS[0]);
    setCreating(false);
  }

  return (
    <div className="w-64">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Étiquettes</p>
      <div className="flex flex-col gap-1">
        {labels.map((label) => (
          <button
            key={label.id}
            type="button"
            onClick={() => onToggle(label)}
            className={`flex items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-accent`}
          >
            <span
              className={`h-6 flex-1 rounded px-2 text-xs font-medium leading-6 text-white ${LABEL_COLOR_CLASSES[label.color]}`}
            >
              {label.name || <span className="italic opacity-80">sans nom</span>}
            </span>
            {label.attached && <Check className="size-4 shrink-0" />}
          </button>
        ))}
      </div>
      {creating ? (
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
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
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-2 flex w-full items-center gap-1 rounded-md border-t border-border pt-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Créer une étiquette
        </button>
      )}
    </div>
  );
}

function DatesPopoverContent({
  dueDate,
  onChange,
}: {
  dueDate: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="w-56">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Date d'échéance</p>
      <input
        type="date"
        autoFocus
        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        value={dueDate}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
      {dueDate && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-2 text-xs text-muted-foreground hover:underline"
        >
          Supprimer la date
        </button>
      )}
    </div>
  );
}

interface AddMenuItem {
  icon: typeof Tag;
  label: string;
  description: string;
  action: () => void;
}

function AddToCardMenu({ items }: { items: AddMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false), open);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={pillClass}
      >
        <Plus className="size-3.5" />
        Ajouter
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-20 w-72 rounded-md border border-border bg-popover p-1.5 text-popover-foreground shadow-lg">
          <p className="px-2 py-1 text-xs font-semibold">Ajouter à la carte</p>
          {items.map(({ icon: Icon, label, description, action }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setOpen(false);
                action();
              }}
              className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-accent"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
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

function fieldHasValue(field: CardFieldValue): boolean {
  if (field.field_type === "checklist") return parseChecklist(field.value).length > 0;
  return field.value.trim().length > 0;
}

function DeleteFieldConfirm({
  field,
  onCancel,
  onConfirm,
}: {
  field: CardFieldValue;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-1 text-sm font-semibold">Supprimer « {field.name} » ?</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Ce champ contient une valeur qui sera définitivement perdue.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

/** A checklist-type custom field renders as its own block (title, progress bar, items) rather than in the compact grid. */
function ChecklistFieldBlock({
  field,
  onChange,
  onCommit,
  onShowOnCardChange,
  onDelete,
}: {
  field: CardFieldValue;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
  onShowOnCardChange: (value: ShowOnCard) => void;
  onDelete: () => void;
}) {
  return (
    <section className="mb-4 rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <CheckSquare className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-sm font-semibold">{field.name}</span>
        <ShowOnCardToggle value={field.show_on_card} onChange={onShowOnCardChange} size="size-3.5" />
        <button
          type="button"
          aria-label="Supprimer la checklist"
          onClick={onDelete}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <ChecklistEditor
        value={field.value}
        onChange={(next) => {
          onChange(next);
          onCommit(next);
        }}
      />
    </section>
  );
}

/** The remaining custom field types (text/date/link/attachment/jira_link) keep the compact grid layout. */
function OtherFieldsGrid({
  fields,
  onChange,
  onCommit,
  onShowOnCardChange,
  onDelete,
}: {
  fields: CardFieldValue[];
  onChange: (customFieldId: number, value: string) => void;
  onCommit: (customFieldId: number, value: string) => void;
  onShowOnCardChange: (customFieldId: number, value: ShowOnCard) => void;
  onDelete: (field: CardFieldValue) => void;
}) {
  if (fields.length === 0) return null;
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.custom_field_id}>
          <div className="mb-1 flex items-center gap-1.5">
            <label className="block flex-1 truncate text-xs font-medium text-muted-foreground">
              {field.name}
            </label>
            <ShowOnCardToggle
              value={field.show_on_card}
              onChange={(value) => onShowOnCardChange(field.custom_field_id, value)}
              size="size-3.5"
            />
            <button
              type="button"
              aria-label="Supprimer le champ"
              onClick={() => onDelete(field)}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <CustomFieldInput
            field={field}
            value={field.value}
            onChange={(value) => onChange(field.custom_field_id, value)}
            onCommit={(value) => onCommit(field.custom_field_id, value)}
          />
        </div>
      ))}
    </div>
  );
}

function CustomFieldCreateForm({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string, type: FieldType, linkPrefix: string) => void;
  onCancel: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newLinkPrefix, setNewLinkPrefix] = useState("");
  const inputClass =
    "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

  function submit() {
    if (!newName.trim()) return;
    onCreate(newName.trim(), newType, newLinkPrefix.trim());
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border border-border p-2.5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          autoFocus
          className={`flex-1 ${inputClass}`}
          placeholder="Nom du champ"
          value={newName}
          onChange={(e) => setNewName(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
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
        Ce champ sera propre à cette carte uniquement, sans effet sur les autres cartes du tableau.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Ajouter
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

const ACTIVITY_ICONS: Record<CardActivity["type"], typeof History> = {
  created: Plus,
  renamed: AlignLeft,
  moved: ArrowLeftRight,
  closed: CheckSquare,
  reopened: RotateCcw,
  due_date: Clock,
  label: Tag,
  cover: Image,
  attachment: Paperclip,
};

function formatActivityDate(iso: string): string {
  return new Date(`${iso.replace(" ", "T")}Z`).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActivitySection({ activities }: { activities: CardActivity[] }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <History className="size-4 text-muted-foreground" />
        Activité
      </div>
      <ul className="space-y-2">
        {activities.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.type] ?? History;
          return (
            <li key={activity.id} className="flex items-start gap-2 text-xs">
              <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-muted-foreground">{activity.message}</span>
              <span className="shrink-0 text-muted-foreground/70">
                {formatActivityDate(activity.created_at)}
              </span>
            </li>
          );
        })}
        {activities.length === 0 && (
          <p className="text-xs text-muted-foreground">Aucune activité.</p>
        )}
      </ul>
    </section>
  );
}

export function CardEditor({
  card,
  boardId,
  columns,
  onClose,
  onRename,
  onDescriptionChange,
  onDueDateChange,
  onCoverChange,
  onLabelsChange,
  onFieldsChange,
  onMove,
  onDelete,
}: {
  card: Card;
  boardId: number;
  columns: { id: number; title: string; color: string | null }[];
  onClose: () => void;
  onRename: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onDueDateChange: (dueDate: string | null) => void;
  onCoverChange: (cover: { cover_color: string | null; cover_image: string | null }) => void;
  onLabelsChange: (labels: { id: number; name: string; color: string }[]) => void;
  onFieldsChange: (fields: CardFieldValue[]) => void;
  onMove: (columnId: number) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [dueDate, setDueDate] = useState(card.due_date ?? "");
  const [coverColor, setCoverColor] = useState(card.cover_color);
  const [coverImage, setCoverImage] = useState(card.cover_image);
  const [slashOpen, setSlashOpen] = useState(false);
  const [jiraError, setJiraError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activities, setActivities] = useState<CardActivity[]>([]);
  const [activityVersion, setActivityVersion] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const [boardLabels, setBoardLabels] = useState<CardLabelOption[]>([]);
  const [activePopover, setActivePopover] = useState<PopoverKind>(null);
  const labelsButtonRef = useRef<HTMLDivElement>(null);
  const datesButtonRef = useRef<HTMLDivElement>(null);
  useClickOutside(labelsButtonRef, () => setActivePopover(null), activePopover === "labels");
  useClickOutside(datesButtonRef, () => setActivePopover(null), activePopover === "dates");

  const [fields, setFields] = useState<CardFieldValue[]>([]);
  const [fieldPendingDelete, setFieldPendingDelete] = useState<CardFieldValue | null>(null);

  const attachedLabels = boardLabels.filter((l) => l.attached);
  const checklistFields = fields.filter((f) => f.field_type === "checklist");
  const otherFields = fields.filter((f) => f.field_type !== "checklist");

  function bumpActivity() {
    setActivityVersion((v) => v + 1);
  }

  useEffect(() => {
    attachmentsApi.list(card.id).then(setAttachments);
  }, [card.id]);

  useEffect(() => {
    activityApi.list(card.id).then(setActivities);
  }, [card.id, activityVersion]);

  useEffect(() => {
    labelsApi.optionsForCard(card.id).then(setBoardLabels);
  }, [card.id]);

  useEffect(() => {
    customFieldsApi.valuesForCard(card.id).then(setFields);
  }, [card.id]);

  useEffect(() => {
    onLabelsChange(attachedLabels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardLabels]);

  useEffect(() => {
    onFieldsChange(fields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

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
    if (value === card.description) return;
    void cardsApi.updateDescription(card.id, value);
    onDescriptionChange(value);
  }

  function handleDueDateChange(value: string) {
    setDueDate(value);
    void cardsApi.setDueDate(card.id, value || null).then(bumpActivity);
    onDueDateChange(value || null);
  }

  function handleCoverColorChange(color: string) {
    setCoverColor(color);
    setCoverImage(null);
    void cardsApi.setCoverColor(card.id, color).then(bumpActivity);
    onCoverChange({ cover_color: color, cover_image: null });
  }

  async function handleCoverImageUpload(file: File) {
    const { cover_image } = await cardsApi.setCoverImage(card.id, file);
    setCoverImage(cover_image);
    setCoverColor(null);
    onCoverChange({ cover_color: null, cover_image });
    bumpActivity();
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
    bumpActivity();
  }

  async function toggleLabel(label: CardLabelOption) {
    setBoardLabels((prev) =>
      prev.map((l) => (l.id === label.id ? { ...l, attached: !l.attached } : l)),
    );
    if (label.attached) {
      await labelsApi.detach(card.id, label.id);
    } else {
      await labelsApi.attach(card.id, label.id);
    }
    bumpActivity();
  }

  async function createLabel(name: string, color: LabelColor) {
    const label = await labelsApi.create(boardId, name, color);
    await labelsApi.attach(card.id, label.id);
    setBoardLabels((prev) => [...prev, { ...label, attached: true }]);
    bumpActivity();
  }

  function handleFieldChange(customFieldId: number, value: string) {
    setFields((prev) =>
      prev.map((f) => (f.custom_field_id === customFieldId ? { ...f, value } : f)),
    );
  }

  function handleFieldCommit(customFieldId: number, value: string) {
    void customFieldsApi.setValueForCard(card.id, customFieldId, value);
  }

  function handleFieldShowOnCardChange(customFieldId: number, value: ShowOnCard) {
    setFields((prev) =>
      prev.map((f) => (f.custom_field_id === customFieldId ? { ...f, show_on_card: value } : f)),
    );
    void customFieldsApi.setShowOnCard(customFieldId, value);
  }

  function requestDeleteField(field: CardFieldValue) {
    if (fieldHasValue(field)) {
      setFieldPendingDelete(field);
    } else {
      void performDeleteField(field.custom_field_id);
    }
  }

  async function performDeleteField(customFieldId: number) {
    await customFieldsApi.remove(customFieldId);
    setFields((prev) => prev.filter((f) => f.custom_field_id !== customFieldId));
    setFieldPendingDelete(null);
  }

  async function createField(name: string, type: FieldType, linkPrefix: string) {
    const field = await customFieldsApi.createForCard(
      card.id,
      name,
      type,
      type === "link" ? linkPrefix : undefined,
    );
    setFields((prev) => [...prev, field]);
    setActivePopover(null);
  }

  async function addChecklist() {
    const count = checklistFields.length;
    const field = await customFieldsApi.createForCard(
      card.id,
      count === 0 ? "Checklist" : `Checklist ${count + 1}`,
      "checklist",
    );
    setFields((prev) => [...prev, field]);
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
    const trimmedKey = key.trim();
    setJiraError(null);
    try {
      const issue = await jiraApi.getIssue(trimmedKey);
      insertAtCursor(`[${issue.key}: ${issue.summary}](${issue.url}) `);
      return;
    } catch (err) {
      // The server may not have network access to Jira (different network/firewall) even
      // though the client's own browser does — fall back to a plain link built from the
      // configured domain, so at least clicking through still works.
      const config = await jiraApi.getConfig().catch(() => null);
      if (config?.domain) {
        insertAtCursor(`[${trimmedKey}](https://${config.domain}/browse/${trimmedKey}) `);
        return;
      }
      setJiraError(err instanceof Error ? err.message : "Erreur Jira");
      setSlashOpen(false);
    }
  }

  async function handleUpload(file: File) {
    const attachment = await attachmentsApi.upload(card.id, file);
    setAttachments((prev) => [...prev, attachment]);
    bumpActivity();
  }

  async function handleDeleteAttachment(id: number) {
    await attachmentsApi.remove(id);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    bumpActivity();
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

  const addMenuItems: AddMenuItem[] = [
    {
      icon: Tag,
      label: "Étiquettes",
      description: "Organisez, répertoriez et classez par ordre de priorité",
      action: () => setActivePopover((v) => (v === "labels" ? null : "labels")),
    },
    {
      icon: Clock,
      label: "Dates",
      description: "Date d'échéance",
      action: () => setActivePopover((v) => (v === "dates" ? null : "dates")),
    },
    {
      icon: CheckSquare,
      label: "Checklist",
      description: "Ajouter des sous-tâches",
      action: () => void addChecklist(),
    },
    {
      icon: Paperclip,
      label: "Pièce jointe",
      description: "Joindre un fichier",
      action: () => attachmentInputRef.current?.click(),
    },
    {
      icon: Folder,
      label: "Champs personnalisés",
      description: "Créer vos propres champs",
      action: () => setActivePopover((v) => (v === "customField" ? null : "customField")),
    },
  ];

  const dueStatusValue = dueDate ? dueStatus({ due_date: dueDate, closed: card.closed }) : "none";
  const dueChipClass =
    dueStatusValue === "overdue"
      ? "bg-destructive/15 text-destructive"
      : dueStatusValue === "soon"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : "bg-muted text-muted-foreground";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-start sm:p-6 sm:pt-16"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl border border-border bg-card text-card-foreground shadow-xl sm:max-h-[85vh] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar: status badge left, cover/menu/close right */}
        <div className="flex items-center justify-between px-4 py-3">
          <StatusBadgeButton columns={columns} currentColumnId={card.column_id} onMove={onMove} />
          <div className="flex items-center gap-1">
            <CoverMenuButton
              coverColor={coverColor}
              hasCover={Boolean(coverColor || coverImage)}
              onPickColor={handleCoverColorChange}
              onUploadImage={handleCoverImageUpload}
              onRemove={handleRemoveCover}
            />
            <CardMenuButton onRequestDelete={() => setDeletePending(true)} />
            <button
              type="button"
              aria-label="Fermer"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent"
            >
              <X className="size-5" />
            </button>
          </div>
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

        {/* Title row */}
        <div className="flex items-start gap-2 px-4 pb-3">
          <span
            title={card.closed ? "Terminée (colonne de fermeture)" : "Non terminée"}
            className={`mt-1.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
              card.closed ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40"
            }`}
          >
            {card.closed && <Check className="size-3" />}
          </span>
          <textarea
            ref={titleRef}
            rows={1}
            className="mt-0.5 flex-1 resize-none overflow-hidden bg-transparent text-lg font-semibold outline-none"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            onBlur={() => {
              const next = title.trim();
              if (next && next !== card.title) {
                void cardsApi.rename(card.id, next).then(bumpActivity);
                onRename(next);
              } else {
                setTitle(card.title);
              }
            }}
          />
        </div>

        {/* Quick-action row */}
        <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
          <AddToCardMenu items={addMenuItems} />
          <div className="relative" ref={labelsButtonRef}>
            <button
              type="button"
              onClick={() => setActivePopover((v) => (v === "labels" ? null : "labels"))}
              className={pillClass}
            >
              <Tag className="size-3.5" />
              Étiquettes
            </button>
            {activePopover === "labels" && (
              <div className="absolute left-0 top-9 z-20 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg">
                <LabelsPopoverContent labels={boardLabels} onToggle={toggleLabel} onCreate={createLabel} />
              </div>
            )}
          </div>
          <div className="relative" ref={datesButtonRef}>
            <button
              type="button"
              onClick={() => setActivePopover((v) => (v === "dates" ? null : "dates"))}
              className={pillClass}
            >
              <Clock className="size-3.5" />
              Dates
            </button>
            {activePopover === "dates" && (
              <div className="absolute left-0 top-9 z-20 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg">
                <DatesPopoverContent dueDate={dueDate} onChange={handleDueDateChange} />
              </div>
            )}
          </div>
          <button type="button" onClick={() => void addChecklist()} className={pillClass}>
            <CheckSquare className="size-3.5" />
            Checklist
          </button>
        </div>

        {/* Two-column body */}
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto px-4 pb-4 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0">
            {attachedLabels.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {attachedLabels.map((label) => (
                  <span
                    key={label.id}
                    className={`rounded px-2 py-1 text-xs font-medium text-white ${LABEL_COLOR_CLASSES[label.color]}`}
                  >
                    {label.name || <span className="italic opacity-80">sans nom</span>}
                  </span>
                ))}
              </div>
            )}

            {dueDate && (
              <div className="mb-4">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Date d'échéance</p>
                <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${dueChipClass}`}>
                  <Clock className="size-3.5" />
                  {new Date(`${dueDate}T00:00:00`).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}

            {checklistFields.map((field) => (
              <ChecklistFieldBlock
                key={field.custom_field_id}
                field={field}
                onChange={(value) => handleFieldChange(field.custom_field_id, value)}
                onCommit={(value) => handleFieldCommit(field.custom_field_id, value)}
                onShowOnCardChange={(value) => handleFieldShowOnCardChange(field.custom_field_id, value)}
                onDelete={() => requestDeleteField(field)}
              />
            ))}

            <section className="mb-4">
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

            <OtherFieldsGrid
              fields={otherFields}
              onChange={handleFieldChange}
              onCommit={handleFieldCommit}
              onShowOnCardChange={handleFieldShowOnCardChange}
              onDelete={requestDeleteField}
            />
            {activePopover === "customField" && (
              <CustomFieldCreateForm onCreate={createField} onCancel={() => setActivePopover(null)} />
            )}

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
                      ref={attachmentInputRef}
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

          <div className="min-w-0 md:border-l md:border-border md:pl-4">
            <ActivitySection activities={activities} />
          </div>
        </div>
      </div>

      {fieldPendingDelete && (
        <DeleteFieldConfirm
          field={fieldPendingDelete}
          onCancel={() => setFieldPendingDelete(null)}
          onConfirm={() => void performDeleteField(fieldPendingDelete.custom_field_id)}
        />
      )}

      {deletePending && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDeletePending(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 text-sm font-semibold">Supprimer « {card.title} » ?</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Cette action est définitive et supprime aussi ses pièces jointes, étiquettes et
              champs.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletePending(false)}
                className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

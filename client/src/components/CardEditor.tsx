import { useEffect, useRef, useState } from "react";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  Code,
  CreditCard,
  Link2,
  Paperclip,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cardsApi, type Card } from "@/lib/cards";
import { attachmentsApi, type Attachment } from "@/lib/attachments";
import { jiraApi } from "@/lib/jira";

export function CardEditor({
  card,
  onClose,
  onRename,
}: {
  card: Card;
  onClose: () => void;
  onRename: (title: string) => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [slashOpen, setSlashOpen] = useState(false);
  const [jiraError, setJiraError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    attachmentsApi.list(card.id).then(setAttachments);
  }, [card.id]);

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
    { icon: CheckSquare, label: "Checklist", action: () => insertAtCursor("\n- [ ] ") },
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
            rows={1}
            className="mt-0.5 flex-1 resize-none bg-transparent text-lg font-semibold outline-none"
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <section className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <AlignLeft className="size-4 text-muted-foreground" />
              Description
            </div>
            <div className="relative">
              <textarea
                ref={textareaRef}
                className="min-h-32 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                placeholder="Ajouter une description... tapez / pour insérer une checklist, une date, un lien Jira ou un bloc de code"
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

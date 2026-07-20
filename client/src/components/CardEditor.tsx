import { useEffect, useRef, useState } from "react";
import { cardsApi, type Card } from "@/lib/cards";
import { attachmentsApi, type Attachment } from "@/lib/attachments";
import { jiraApi } from "@/lib/jira";
import { Button } from "@/components/ui/button";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    attachmentsApi.list(card.id).then(setAttachments);
  }, [card.id]);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-md border border-border bg-background p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <input
            className="flex-1 bg-transparent text-lg font-semibold outline-none"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            onBlur={() => {
              if (title.trim() && title !== card.title) {
                void cardsApi.rename(card.id, title);
                onRename(title);
              }
            }}
          />
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>

        <div className="relative mb-1">
          <textarea
            ref={textareaRef}
            className="min-h-32 w-full rounded-md border border-input bg-background p-2 text-sm"
            placeholder="Notes... tapez / pour Checklist, Date du jour, Lien Jira ou Bloc de code"
            value={description}
            onChange={handleDescriptionChange}
            onBlur={(e) => saveDescription(e.currentTarget.value)}
          />
          {slashOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 flex w-56 flex-col gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md">
              <button
                type="button"
                className="rounded px-2 py-1 text-left text-sm hover:bg-accent"
                onClick={() => insertAtCursor("\n- [ ] ")}
              >
                ☑ Checklist
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-left text-sm hover:bg-accent"
                onClick={() => insertAtCursor(new Date().toLocaleDateString("fr-FR"))}
              >
                📅 Date du jour
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-left text-sm hover:bg-accent"
                onClick={handleSlashJira}
              >
                🔗 Lien Jira
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-left text-sm hover:bg-accent"
                onClick={() => insertAtCursor("\n```\n\n```\n", 4)}
              >
                {"</>"} Bloc de code
              </button>
            </div>
          )}
        </div>
        {jiraError && <p className="mb-2 text-sm text-destructive">{jiraError}</p>}

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Pièces jointes</p>
          <div
            className="mb-2 rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void handleUpload(file);
            }}
          >
            Glisser-déposer un fichier, ou{" "}
            <label className="cursor-pointer text-primary underline">
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
          </div>
          <ul className="space-y-1">
            {attachments.map((a) => (
              <li
                key={a.id}
                title="Double-cliquer pour ouvrir"
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-border px-2 py-1 text-sm"
                onDoubleClick={() => window.open(attachmentsApi.fileUrl(a.id), "_blank", "noopener")}
              >
                <span className="flex-1 truncate">{a.file_name}</span>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteAttachment(a.id)}>
                  ✕
                </Button>
              </li>
            ))}
            {attachments.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucune pièce jointe.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

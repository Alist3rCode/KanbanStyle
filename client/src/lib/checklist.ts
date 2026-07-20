export interface ChecklistItem {
  text: string;
  done: boolean;
}

/** Checklist field values are stored as a JSON array of items in the field's TEXT `value` column. */
export function parseChecklist(value: string): ChecklistItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is { text?: unknown; done?: unknown } => typeof item === "object" && item !== null)
      .map((item) => ({ text: String(item.text ?? ""), done: Boolean(item.done) }));
  } catch {
    return [];
  }
}

export function serializeChecklist(items: ChecklistItem[]): string {
  return JSON.stringify(items);
}

export function checklistProgress(value: string): { done: number; total: number } {
  const items = parseChecklist(value);
  return { done: items.filter((item) => item.done).length, total: items.length };
}

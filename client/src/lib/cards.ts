import { api } from "@/lib/api";

export interface Card {
  id: number;
  column_id: number;
  title: string;
  description: string;
  position: number;
  closed: boolean;
  closed_at: string | null;
  due_date: string | null;
  cover_color: string | null;
  cover_image: string | null;
  has_attachments: boolean;
}

export type DueStatus = "overdue" | "soon" | "none";

/** Overdue (red) if past due and not done; soon (yellow) if due today or tomorrow; else no highlight. */
export function dueStatus(card: Pick<Card, "due_date" | "closed">): DueStatus {
  if (!card.due_date || card.closed) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${card.due_date}T00:00:00`);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 1) return "soon";
  return "none";
}

export const cardsApi = {
  list: (columnId: number) => api.get<Card[]>(`/columns/${columnId}/cards`),
  create: (columnId: number, title: string) =>
    api.post<Card>(`/columns/${columnId}/cards`, { title }),
  rename: (id: number, title: string) => api.patch<void>(`/cards/${id}`, { title }),
  updateDescription: (id: number, description: string) =>
    api.patch<void>(`/cards/${id}`, { description }),
  setDueDate: (id: number, due_date: string | null) =>
    api.patch<void>(`/cards/${id}`, { due_date }),
  setCoverColor: (id: number, cover_color: string | null) =>
    api.patch<void>(`/cards/${id}`, { cover_color }),
  async setCoverImage(id: number, file: File): Promise<{ cover_image: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/cards/${id}/cover-image`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Échec de l'envoi de l'image");
    }
    return res.json();
  },
  removeCoverImage: (id: number) => api.delete<void>(`/cards/${id}/cover-image`),
  coverImageUrl: (id: number, file: string) => `/api/cards/${id}/cover-image/${file}`,
  move: (id: number, column_id: number, position: number) =>
    api.post<void>(`/cards/${id}/move`, { column_id, position }),
  remove: (id: number) => api.delete<void>(`/cards/${id}`),
};

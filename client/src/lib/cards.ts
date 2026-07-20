import { api } from "@/lib/api";

export interface Card {
  id: number;
  column_id: number;
  title: string;
  description: string;
  position: number;
  closed: boolean;
  closed_at: string | null;
}

export const cardsApi = {
  list: (columnId: number) => api.get<Card[]>(`/columns/${columnId}/cards`),
  create: (columnId: number, title: string) =>
    api.post<Card>(`/columns/${columnId}/cards`, { title }),
  rename: (id: number, title: string) => api.patch<void>(`/cards/${id}`, { title }),
  move: (id: number, column_id: number, position: number) =>
    api.post<void>(`/cards/${id}/move`, { column_id, position }),
  remove: (id: number) => api.delete<void>(`/cards/${id}`),
};

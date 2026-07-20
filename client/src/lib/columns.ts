import { api } from "@/lib/api";

export interface Column {
  id: number;
  board_id: number;
  title: string;
  position: number;
  is_closing_column: boolean;
  color: string | null;
}

export const columnsApi = {
  list: (boardId: number) => api.get<Column[]>(`/boards/${boardId}/columns`),
  create: (boardId: number, title: string) =>
    api.post<Column>(`/boards/${boardId}/columns`, { title }),
  rename: (id: number, title: string) => api.patch<void>(`/columns/${id}`, { title }),
  reorder: (id: number, position: number) => api.patch<void>(`/columns/${id}`, { position }),
  setClosingRule: (id: number, is_closing_column: boolean) =>
    api.patch<void>(`/columns/${id}`, { is_closing_column }),
  setColor: (id: number, color: string | null) => api.patch<void>(`/columns/${id}`, { color }),
  remove: (id: number) => api.delete<void>(`/columns/${id}`),
};

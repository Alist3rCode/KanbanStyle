import { api } from "@/lib/api";

export interface Board {
  id: number;
  title: string;
  position: number;
}

export const boardsApi = {
  list: () => api.get<Board[]>("/boards"),
  create: (title: string) => api.post<Board>("/boards", { title }),
  rename: (id: number, title: string) => api.patch<void>(`/boards/${id}`, { title }),
  reorder: (id: number, position: number) => api.patch<void>(`/boards/${id}`, { position }),
  remove: (id: number) => api.delete<void>(`/boards/${id}`),
};

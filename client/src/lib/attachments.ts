import { api } from "@/lib/api";

export interface Attachment {
  id: number;
  card_id: number;
  file_name: string;
  created_at: string;
}

export const attachmentsApi = {
  list: (cardId: number) => api.get<Attachment[]>(`/cards/${cardId}/attachments`),
  remove: (id: number) => api.delete<void>(`/attachments/${id}`),
  fileUrl: (id: number) => `/api/attachments/${id}/file`,
  async upload(cardId: number, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/cards/${cardId}/attachments`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Échec de l'envoi du fichier");
    }
    return res.json();
  },
};

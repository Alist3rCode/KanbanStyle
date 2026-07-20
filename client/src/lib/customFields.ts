import { api } from "@/lib/api";

export type FieldType = "text" | "date" | "link" | "checklist" | "attachment" | "jira_link";

export interface CustomField {
  id: number;
  board_id: number;
  name: string;
  field_type: FieldType;
  position: number;
  link_prefix: string | null;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Texte",
  date: "Date",
  link: "Lien",
  checklist: "Checklist",
  attachment: "Pièce jointe",
  jira_link: "Lien Jira",
};

export const customFieldsApi = {
  list: (boardId: number) => api.get<CustomField[]>(`/boards/${boardId}/custom-fields`),
  create: (boardId: number, name: string, field_type: FieldType, link_prefix?: string) =>
    api.post<CustomField>(`/boards/${boardId}/custom-fields`, { name, field_type, link_prefix }),
  reorder: (id: number, position: number) =>
    api.patch<void>(`/custom-fields/${id}`, { position }),
  remove: (id: number) => api.delete<void>(`/custom-fields/${id}`),
};

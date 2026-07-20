import { api } from "@/lib/api";

export type ActivityType =
  | "created"
  | "renamed"
  | "moved"
  | "closed"
  | "reopened"
  | "due_date"
  | "label"
  | "cover"
  | "attachment";

export interface CardActivity {
  id: number;
  card_id: number;
  type: ActivityType;
  message: string;
  created_at: string;
}

export const activityApi = {
  list: (cardId: number) => api.get<CardActivity[]>(`/cards/${cardId}/activities`),
};

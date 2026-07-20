import { db } from "./db.js";

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

export function logActivity(cardId: number | bigint | string, type: ActivityType, message: string) {
  db.prepare("INSERT INTO card_activities (card_id, type, message) VALUES (?, ?, ?)").run(
    cardId,
    type,
    message,
  );
}

import { Router } from "express";
import { db } from "../db.js";

export const activityRouter = Router();

activityRouter.get("/cards/:cardId/activities", (req, res) => {
  const activities = db
    .prepare(
      "SELECT id, card_id, type, message, created_at FROM card_activities WHERE card_id = ? ORDER BY created_at DESC, id DESC",
    )
    .all(req.params.cardId);
  res.json(activities);
});

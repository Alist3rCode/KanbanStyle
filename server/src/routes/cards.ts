import { Router } from "express";
import { db } from "../db.js";

export const cardsRouter = Router();

cardsRouter.get("/columns/:columnId/cards", (req, res) => {
  const cards = db
    .prepare(
      "SELECT id, column_id, title, description, position, closed, closed_at FROM cards WHERE column_id = ? ORDER BY position, id",
    )
    .all(req.params.columnId);
  res.json(cards);
});

cardsRouter.post("/columns/:columnId/cards", (req, res) => {
  const title = String(req.body.title ?? "").trim();
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const columnId = req.params.columnId;
  const { position } = db
    .prepare("SELECT COALESCE(MAX(position) + 1, 0) as position FROM cards WHERE column_id = ?")
    .get(columnId) as { position: number };
  const info = db
    .prepare("INSERT INTO cards (column_id, title, position) VALUES (?, ?, ?)")
    .run(columnId, title, position);
  res.status(201).json({
    id: info.lastInsertRowid,
    column_id: Number(columnId),
    title,
    description: "",
    position,
    closed: false,
    closed_at: null,
  });
});

cardsRouter.patch("/cards/:id", (req, res) => {
  const { title, description } = req.body as { title?: string; description?: string };
  if (title !== undefined) {
    db.prepare("UPDATE cards SET title = ? WHERE id = ?").run(title, req.params.id);
  }
  if (description !== undefined) {
    db.prepare("UPDATE cards SET description = ? WHERE id = ?").run(description, req.params.id);
  }
  res.status(204).end();
});

cardsRouter.post("/cards/:id/move", (req, res) => {
  const { column_id, position } = req.body as { column_id: number; position: number };
  db.prepare("UPDATE cards SET column_id = ?, position = ? WHERE id = ?").run(
    column_id,
    position,
    req.params.id,
  );
  res.status(204).end();
});

cardsRouter.delete("/cards/:id", (req, res) => {
  db.prepare("DELETE FROM cards WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

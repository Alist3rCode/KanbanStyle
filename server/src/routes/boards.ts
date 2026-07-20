import { Router } from "express";
import { db } from "../db.js";

export const boardsRouter = Router();

boardsRouter.get("/boards", (_req, res) => {
  const boards = db.prepare("SELECT id, title, position FROM boards ORDER BY position, id").all();
  res.json(boards);
});

boardsRouter.post("/boards", (req, res) => {
  const title = String(req.body.title ?? "").trim();
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const { position } = db
    .prepare("SELECT COALESCE(MAX(position) + 1, 0) as position FROM boards")
    .get() as { position: number };
  const info = db
    .prepare("INSERT INTO boards (title, position) VALUES (?, ?)")
    .run(title, position);
  res.status(201).json({ id: info.lastInsertRowid, title, position });
});

boardsRouter.patch("/boards/:id", (req, res) => {
  const { title, position } = req.body as { title?: string; position?: number };
  if (title !== undefined) {
    db.prepare("UPDATE boards SET title = ? WHERE id = ?").run(title, req.params.id);
  }
  if (position !== undefined) {
    db.prepare("UPDATE boards SET position = ? WHERE id = ?").run(position, req.params.id);
  }
  res.status(204).end();
});

boardsRouter.delete("/boards/:id", (req, res) => {
  db.prepare("DELETE FROM boards WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

import { Router } from "express";
import { db } from "../db.js";

export const columnsRouter = Router();

columnsRouter.get("/boards/:boardId/columns", (req, res) => {
  const columns = db
    .prepare(
      "SELECT id, board_id, title, position, is_closing_column FROM columns WHERE board_id = ? ORDER BY position, id",
    )
    .all(req.params.boardId);
  res.json(columns);
});

columnsRouter.post("/boards/:boardId/columns", (req, res) => {
  const title = String(req.body.title ?? "").trim();
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const boardId = req.params.boardId;
  const { position } = db
    .prepare("SELECT COALESCE(MAX(position) + 1, 0) as position FROM columns WHERE board_id = ?")
    .get(boardId) as { position: number };
  const info = db
    .prepare("INSERT INTO columns (board_id, title, position) VALUES (?, ?, ?)")
    .run(boardId, title, position);
  res.status(201).json({
    id: info.lastInsertRowid,
    board_id: Number(boardId),
    title,
    position,
    is_closing_column: false,
  });
});

columnsRouter.patch("/columns/:id", (req, res) => {
  const { title, position, is_closing_column } = req.body as {
    title?: string;
    position?: number;
    is_closing_column?: boolean;
  };
  if (title !== undefined) {
    db.prepare("UPDATE columns SET title = ? WHERE id = ?").run(title, req.params.id);
  }
  if (position !== undefined) {
    db.prepare("UPDATE columns SET position = ? WHERE id = ?").run(position, req.params.id);
  }
  if (is_closing_column !== undefined) {
    db.prepare("UPDATE columns SET is_closing_column = ? WHERE id = ?").run(
      is_closing_column ? 1 : 0,
      req.params.id,
    );
  }
  res.status(204).end();
});

columnsRouter.delete("/columns/:id", (req, res) => {
  db.prepare("DELETE FROM columns WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

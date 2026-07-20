import { Router } from "express";
import { db } from "../db.js";
import { logActivity } from "../activity.js";
import { isLabelColor } from "./labels.js";

export const columnsRouter = Router();

columnsRouter.get("/boards/:boardId/columns", (req, res) => {
  const columns = db
    .prepare(
      "SELECT id, board_id, title, position, is_closing_column, color FROM columns WHERE board_id = ? ORDER BY position, id",
    )
    .all(req.params.boardId) as { is_closing_column: number }[];
  // SQLite has no real boolean — cast the raw 0/1 so the client gets a true JS boolean.
  res.json(columns.map((c) => ({ ...c, is_closing_column: Boolean(c.is_closing_column) })));
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
    color: null,
  });
});

columnsRouter.patch("/columns/:id", (req, res) => {
  const { title, position, is_closing_column, color } = req.body as {
    title?: string;
    position?: number;
    is_closing_column?: boolean;
    color?: string | null;
  };
  if (color !== undefined && color !== null && !isLabelColor(color)) {
    res.status(400).json({ error: "color doit être une couleur valide" });
    return;
  }
  if (title !== undefined) {
    db.prepare("UPDATE columns SET title = ? WHERE id = ?").run(title, req.params.id);
  }
  if (position !== undefined) {
    db.prepare("UPDATE columns SET position = ? WHERE id = ?").run(position, req.params.id);
  }
  if (color !== undefined) {
    db.prepare("UPDATE columns SET color = ? WHERE id = ?").run(color, req.params.id);
  }
  if (is_closing_column !== undefined) {
    const closed = is_closing_column ? 1 : 0;
    const closedAt = closed ? new Date().toISOString() : null;
    db.prepare("UPDATE columns SET is_closing_column = ? WHERE id = ?").run(
      closed,
      req.params.id,
    );
    const affected = db
      .prepare("SELECT id FROM cards WHERE column_id = ? AND closed != ?")
      .all(req.params.id, closed) as { id: number }[];
    // Keep every card in this column consistent with the new rule (US-05).
    db.prepare("UPDATE cards SET closed = ?, closed_at = ? WHERE column_id = ?").run(
      closed,
      closedAt,
      req.params.id,
    );
    for (const card of affected) {
      logActivity(
        card.id,
        closed ? "closed" : "reopened",
        closed ? "Marquée comme terminée" : "Marquée comme non terminée",
      );
    }
  }
  res.status(204).end();
});

columnsRouter.delete("/columns/:id", (req, res) => {
  db.prepare("DELETE FROM columns WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

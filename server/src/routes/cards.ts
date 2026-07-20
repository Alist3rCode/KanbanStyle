import { Router } from "express";
import { db } from "../db.js";

export const cardsRouter = Router();

/** A card's closed/closed_at always mirrors its current column's closing rule (US-05). */
function closingRuleFor(columnId: number | string): { closed: number; closedAt: string | null } {
  const column = db
    .prepare("SELECT is_closing_column FROM columns WHERE id = ?")
    .get(columnId) as { is_closing_column: number } | undefined;
  const closed = column?.is_closing_column ? 1 : 0;
  return { closed, closedAt: closed ? new Date().toISOString() : null };
}

/** Instantiates the board's custom-field template on every new card (US-04). */
function instantiateTemplate(cardId: number | bigint, columnId: string) {
  const fields = db
    .prepare(
      `SELECT id FROM custom_fields
       WHERE board_id = (SELECT board_id FROM columns WHERE id = ?)`,
    )
    .all(columnId) as { id: number }[];
  const insert = db.prepare(
    "INSERT INTO field_values (card_id, custom_field_id, value) VALUES (?, ?, '')",
  );
  const insertAll = db.transaction((rows: { id: number }[]) => {
    for (const field of rows) insert.run(cardId, field.id);
  });
  insertAll(fields);
}

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
  const { closed, closedAt } = closingRuleFor(columnId);
  const info = db
    .prepare(
      "INSERT INTO cards (column_id, title, position, closed, closed_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(columnId, title, position, closed, closedAt);
  instantiateTemplate(info.lastInsertRowid, columnId);
  res.status(201).json({
    id: info.lastInsertRowid,
    column_id: Number(columnId),
    title,
    description: "",
    position,
    closed: Boolean(closed),
    closed_at: closedAt,
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
  const { closed, closedAt } = closingRuleFor(column_id);
  db.prepare(
    "UPDATE cards SET column_id = ?, position = ?, closed = ?, closed_at = ? WHERE id = ?",
  ).run(column_id, position, closed, closedAt, req.params.id);
  res.status(204).end();
});

cardsRouter.delete("/cards/:id", (req, res) => {
  db.prepare("DELETE FROM cards WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

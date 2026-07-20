import { Router } from "express";
import { db } from "../db.js";
import { logActivity } from "../activity.js";

export const labelsRouter = Router();

export const LABEL_COLORS = [
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "blue",
  "sky",
  "lime",
  "pink",
  "gray",
] as const;

export function isLabelColor(value: unknown): value is (typeof LABEL_COLORS)[number] {
  return typeof value === "string" && (LABEL_COLORS as readonly string[]).includes(value);
}

labelsRouter.get("/boards/:boardId/labels", (req, res) => {
  const labels = db
    .prepare(
      "SELECT id, board_id, name, color, position FROM labels WHERE board_id = ? ORDER BY position, id",
    )
    .all(req.params.boardId);
  res.json(labels);
});

labelsRouter.post("/boards/:boardId/labels", (req, res) => {
  const { name, color } = req.body as { name?: string; color?: string };
  if (!isLabelColor(color)) {
    res.status(400).json({ error: `color doit être l'une de: ${LABEL_COLORS.join(", ")}` });
    return;
  }
  const boardId = req.params.boardId;
  const { position } = db
    .prepare("SELECT COALESCE(MAX(position) + 1, 0) as position FROM labels WHERE board_id = ?")
    .get(boardId) as { position: number };
  const info = db
    .prepare("INSERT INTO labels (board_id, name, color, position) VALUES (?, ?, ?, ?)")
    .run(boardId, name?.trim() ?? "", color, position);
  res.status(201).json({
    id: info.lastInsertRowid,
    board_id: Number(boardId),
    name: name?.trim() ?? "",
    color,
    position,
  });
});

labelsRouter.patch("/labels/:id", (req, res) => {
  const { name, color, position } = req.body as {
    name?: string;
    color?: string;
    position?: number;
  };
  if (color !== undefined && !isLabelColor(color)) {
    res.status(400).json({ error: `color doit être l'une de: ${LABEL_COLORS.join(", ")}` });
    return;
  }
  if (name !== undefined) {
    db.prepare("UPDATE labels SET name = ? WHERE id = ?").run(name, req.params.id);
  }
  if (color !== undefined) {
    db.prepare("UPDATE labels SET color = ? WHERE id = ?").run(color, req.params.id);
  }
  if (position !== undefined) {
    db.prepare("UPDATE labels SET position = ? WHERE id = ?").run(position, req.params.id);
  }
  res.status(204).end();
});

labelsRouter.delete("/labels/:id", (req, res) => {
  db.prepare("DELETE FROM labels WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

labelsRouter.get("/cards/:cardId/labels", (req, res) => {
  const labels = db
    .prepare(
      `SELECT l.id, l.name, l.color
       FROM card_labels cl
       JOIN labels l ON l.id = cl.label_id
       WHERE cl.card_id = ?
       ORDER BY l.position, l.id`,
    )
    .all(req.params.cardId);
  res.json(labels);
});

/** Every label on the card's board, flagged as attached or not — powers the card editor's label picker. */
labelsRouter.get("/cards/:cardId/board-labels", (req, res) => {
  const labels = db
    .prepare(
      `SELECT l.id, l.name, l.color,
              EXISTS(SELECT 1 FROM card_labels cl WHERE cl.card_id = ? AND cl.label_id = l.id) as attached
       FROM labels l
       WHERE l.board_id = (SELECT board_id FROM columns WHERE id = (SELECT column_id FROM cards WHERE id = ?))
       ORDER BY l.position, l.id`,
    )
    .all(req.params.cardId, req.params.cardId) as { attached: number }[];
  // SQLite has no real boolean — cast the raw 0/1 so the client gets a true JS boolean.
  res.json(labels.map((l) => ({ ...l, attached: Boolean(l.attached) })));
});

labelsRouter.post("/cards/:cardId/labels/:labelId", (req, res) => {
  const info = db
    .prepare("INSERT OR IGNORE INTO card_labels (card_id, label_id) VALUES (?, ?)")
    .run(req.params.cardId, req.params.labelId);
  if (info.changes > 0) {
    const label = db
      .prepare("SELECT name FROM labels WHERE id = ?")
      .get(req.params.labelId) as { name: string } | undefined;
    logActivity(req.params.cardId, "label", `Étiquette « ${label?.name || "Sans nom"} » ajoutée`);
  }
  res.status(204).end();
});

labelsRouter.delete("/cards/:cardId/labels/:labelId", (req, res) => {
  const label = db
    .prepare("SELECT name FROM labels WHERE id = ?")
    .get(req.params.labelId) as { name: string } | undefined;
  const info = db
    .prepare("DELETE FROM card_labels WHERE card_id = ? AND label_id = ?")
    .run(req.params.cardId, req.params.labelId);
  if (info.changes > 0) {
    logActivity(req.params.cardId, "label", `Étiquette « ${label?.name || "Sans nom"} » retirée`);
  }
  res.status(204).end();
});

/** Board-wide card→label mapping, for rendering pills on the card front and the label filter (one query, no N+1). */
labelsRouter.get("/boards/:boardId/card-labels", (req, res) => {
  const rows = db
    .prepare(
      `SELECT cl.card_id, l.id as label_id, l.name, l.color
       FROM card_labels cl
       JOIN labels l ON l.id = cl.label_id
       WHERE l.board_id = ?`,
    )
    .all(req.params.boardId);
  res.json(rows);
});

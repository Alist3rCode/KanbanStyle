import { Router } from "express";
import { db } from "../db.js";

export const customFieldsRouter = Router();

const FIELD_TYPES = ["text", "date", "link", "checklist", "attachment", "jira_link"] as const;
type FieldType = (typeof FIELD_TYPES)[number];

function isFieldType(value: unknown): value is FieldType {
  return typeof value === "string" && (FIELD_TYPES as readonly string[]).includes(value);
}

const SHOW_ON_CARD_VALUES = ["always", "if_not_empty", "never"] as const;
type ShowOnCard = (typeof SHOW_ON_CARD_VALUES)[number];

function isShowOnCard(value: unknown): value is ShowOnCard {
  return typeof value === "string" && (SHOW_ON_CARD_VALUES as readonly string[]).includes(value);
}

// Only the board-wide template fields — card-specific fields (card_id set) are managed from the card itself.
customFieldsRouter.get("/boards/:boardId/custom-fields", (req, res) => {
  const fields = db
    .prepare(
      "SELECT id, board_id, name, field_type, position, link_prefix, default_value, show_on_card FROM custom_fields WHERE board_id = ? AND card_id IS NULL ORDER BY position, id",
    )
    .all(req.params.boardId);
  res.json(fields);
});

customFieldsRouter.post("/boards/:boardId/custom-fields", (req, res) => {
  const { name, field_type, link_prefix, default_value, show_on_card } = req.body as {
    name?: string;
    field_type?: string;
    link_prefix?: string;
    default_value?: string;
    show_on_card?: string;
  };
  if (!name?.trim() || !isFieldType(field_type)) {
    res.status(400).json({ error: `name est requis et field_type doit être l'un de: ${FIELD_TYPES.join(", ")}` });
    return;
  }
  if (show_on_card !== undefined && !isShowOnCard(show_on_card)) {
    res.status(400).json({ error: `show_on_card doit être l'un de: ${SHOW_ON_CARD_VALUES.join(", ")}` });
    return;
  }
  const boardId = req.params.boardId;
  // Checklists store a JSON array of items, not free text — a new field always starts empty.
  const resolvedDefaultValue = field_type === "checklist" ? "[]" : default_value?.trim() ?? "";
  const { position } = db
    .prepare("SELECT COALESCE(MAX(position) + 1, 0) as position FROM custom_fields WHERE board_id = ?")
    .get(boardId) as { position: number };
  const info = db
    .prepare(
      "INSERT INTO custom_fields (board_id, name, field_type, position, link_prefix, default_value, show_on_card) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      boardId,
      name.trim(),
      field_type,
      position,
      link_prefix?.trim() || null,
      resolvedDefaultValue,
      show_on_card ?? "if_not_empty",
    );
  res.status(201).json({
    id: info.lastInsertRowid,
    board_id: Number(boardId),
    name: name.trim(),
    field_type,
    position,
    link_prefix: link_prefix?.trim() || null,
    default_value: resolvedDefaultValue,
    show_on_card: show_on_card ?? "if_not_empty",
  });
});

customFieldsRouter.patch("/custom-fields/:id", (req, res) => {
  const { name, position, link_prefix, default_value, show_on_card } = req.body as {
    name?: string;
    position?: number;
    link_prefix?: string | null;
    default_value?: string;
    show_on_card?: string;
  };
  if (show_on_card !== undefined && !isShowOnCard(show_on_card)) {
    res.status(400).json({ error: `show_on_card doit être l'un de: ${SHOW_ON_CARD_VALUES.join(", ")}` });
    return;
  }
  if (name !== undefined) {
    db.prepare("UPDATE custom_fields SET name = ? WHERE id = ?").run(name, req.params.id);
  }
  if (position !== undefined) {
    db.prepare("UPDATE custom_fields SET position = ? WHERE id = ?").run(position, req.params.id);
  }
  if (link_prefix !== undefined) {
    db.prepare("UPDATE custom_fields SET link_prefix = ? WHERE id = ?").run(
      link_prefix || null,
      req.params.id,
    );
  }
  if (default_value !== undefined) {
    db.prepare("UPDATE custom_fields SET default_value = ? WHERE id = ?").run(
      default_value,
      req.params.id,
    );
  }
  if (show_on_card !== undefined) {
    db.prepare("UPDATE custom_fields SET show_on_card = ? WHERE id = ?").run(
      show_on_card,
      req.params.id,
    );
  }
  res.status(204).end();
});

customFieldsRouter.delete("/custom-fields/:id", (req, res) => {
  db.prepare("DELETE FROM custom_fields WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

/**
 * All field values for every card on a board — used both for client-side
 * search/filter (US-07, filtered to non-empty client-side) and to render
 * values per their `show_on_card` rule on the card front (US-10: "always"
 * must render even when empty), in one query (no N+1).
 */
customFieldsRouter.get("/boards/:boardId/field-values", (req, res) => {
  const values = db
    .prepare(
      `SELECT fv.card_id, cf.name, cf.field_type, cf.show_on_card, fv.value
       FROM field_values fv
       JOIN custom_fields cf ON cf.id = fv.custom_field_id
       WHERE cf.board_id = ?`,
    )
    .all(req.params.boardId);
  res.json(values);
});

// Board-wide template fields (card_id IS NULL) plus any fields created for this specific card.
customFieldsRouter.get("/cards/:cardId/field-values", (req, res) => {
  const values = db
    .prepare(
      `SELECT cf.id as custom_field_id, cf.name, cf.field_type, cf.link_prefix, cf.show_on_card,
              COALESCE(fv.value, cf.default_value) as value
       FROM custom_fields cf
       LEFT JOIN field_values fv ON fv.custom_field_id = cf.id AND fv.card_id = ?
       WHERE cf.card_id = ?
          OR (cf.card_id IS NULL
              AND cf.board_id = (SELECT board_id FROM columns WHERE id = (SELECT column_id FROM cards WHERE id = ?)))
       ORDER BY cf.position, cf.id`,
    )
    .all(req.params.cardId, req.params.cardId, req.params.cardId);
  res.json(values);
});

customFieldsRouter.put("/cards/:cardId/field-values/:customFieldId", (req, res) => {
  const value = String(req.body.value ?? "");
  db.prepare(
    `INSERT INTO field_values (card_id, custom_field_id, value) VALUES (?, ?, ?)
     ON CONFLICT(card_id, custom_field_id) DO UPDATE SET value = excluded.value`,
  ).run(req.params.cardId, req.params.customFieldId, value);
  res.status(204).end();
});

/** Creates a field scoped to this card only (US-11 follow-up) — never appears on, or is instantiated onto, other cards. */
customFieldsRouter.post("/cards/:cardId/custom-fields", (req, res) => {
  const { name, field_type, link_prefix, value } = req.body as {
    name?: string;
    field_type?: string;
    link_prefix?: string;
    value?: string;
  };
  if (!name?.trim() || !isFieldType(field_type)) {
    res
      .status(400)
      .json({ error: `name est requis et field_type doit être l'un de: ${FIELD_TYPES.join(", ")}` });
    return;
  }
  const cardId = req.params.cardId;
  const board = db
    .prepare(
      "SELECT board_id FROM columns WHERE id = (SELECT column_id FROM cards WHERE id = ?)",
    )
    .get(cardId) as { board_id: number } | undefined;
  if (!board) {
    res.status(404).json({ error: "Carte introuvable" });
    return;
  }

  // Checklists store a JSON array of items, not free text — a new field always starts empty.
  const resolvedValue = field_type === "checklist" ? "[]" : value ?? "";
  const insertField = db.prepare(
    "INSERT INTO custom_fields (board_id, card_id, name, field_type, position, link_prefix, default_value, show_on_card) VALUES (?, ?, ?, ?, 0, ?, '', 'if_not_empty')",
  );
  const insertValue = db.prepare(
    "INSERT INTO field_values (card_id, custom_field_id, value) VALUES (?, ?, ?)",
  );
  const create = db.transaction(() => {
    const info = insertField.run(
      board.board_id,
      cardId,
      name.trim(),
      field_type,
      link_prefix?.trim() || null,
    );
    insertValue.run(cardId, info.lastInsertRowid, resolvedValue);
    return info.lastInsertRowid;
  });
  const customFieldId = create();

  res.status(201).json({
    custom_field_id: customFieldId,
    name: name.trim(),
    field_type,
    link_prefix: link_prefix?.trim() || null,
    show_on_card: "if_not_empty",
    value: resolvedValue,
  });
});

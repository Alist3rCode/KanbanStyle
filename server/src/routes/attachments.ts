import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { mkdirSync, unlink } from "node:fs";
import path from "node:path";
import { db, DATA_DIR } from "../db.js";
import { logActivity } from "../activity.js";

export const attachmentsRouter = Router();

const ATTACHMENTS_DIR = path.join(DATA_DIR, "attachments");
mkdirSync(ATTACHMENTS_DIR, { recursive: true });

// No file-size limit by design (US-06: "sans limite de taille").
const upload = multer({
  storage: multer.diskStorage({
    destination: ATTACHMENTS_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
  }),
});

attachmentsRouter.get("/cards/:cardId/attachments", (req, res) => {
  const attachments = db
    .prepare(
      "SELECT id, card_id, file_name, created_at FROM attachments WHERE card_id = ? ORDER BY created_at, id",
    )
    .all(req.params.cardId);
  res.json(attachments);
});

attachmentsRouter.post("/cards/:cardId/attachments", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "file est requis" });
    return;
  }
  const info = db
    .prepare("INSERT INTO attachments (card_id, file_name, stored_path) VALUES (?, ?, ?)")
    .run(req.params.cardId, req.file.originalname, req.file.filename);
  logActivity(req.params.cardId, "attachment", `Pièce jointe « ${req.file.originalname} » ajoutée`);
  res.status(201).json({
    id: info.lastInsertRowid,
    card_id: Number(req.params.cardId),
    file_name: req.file.originalname,
    created_at: new Date().toISOString(),
  });
});

attachmentsRouter.get("/attachments/:id/file", (req, res) => {
  const attachment = db
    .prepare("SELECT file_name, stored_path FROM attachments WHERE id = ?")
    .get(req.params.id) as { file_name: string; stored_path: string } | undefined;
  if (!attachment) {
    res.status(404).json({ error: "Pièce jointe introuvable" });
    return;
  }
  res.sendFile(path.join(ATTACHMENTS_DIR, attachment.stored_path), {
    headers: { "Content-Disposition": `inline; filename="${attachment.file_name}"` },
  });
});

attachmentsRouter.delete("/attachments/:id", (req, res) => {
  const attachment = db
    .prepare("SELECT card_id, file_name, stored_path FROM attachments WHERE id = ?")
    .get(req.params.id) as { card_id: number; file_name: string; stored_path: string } | undefined;
  db.prepare("DELETE FROM attachments WHERE id = ?").run(req.params.id);
  if (attachment) {
    unlink(path.join(ATTACHMENTS_DIR, attachment.stored_path), () => {});
    logActivity(attachment.card_id, "attachment", `Pièce jointe « ${attachment.file_name} » retirée`);
  }
  res.status(204).end();
});

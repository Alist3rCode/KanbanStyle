import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { db } from "./db.js";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

/** Creates the single admin account on first boot if no user exists yet. */
export function ensureAdminUser() {
  const count = (db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number }).n;
  if (count > 0) return;

  const username = process.env.ADMIN_USERNAME ?? "admin";
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = randomBytes(9).toString("base64url");
    console.log("=".repeat(60));
    console.log(`No ADMIN_PASSWORD set — generated one-time password for "${username}":`);
    console.log(`  ${password}`);
    console.log("Set ADMIN_USERNAME/ADMIN_PASSWORD env vars to control this.");
    console.log("=".repeat(60));
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
}

export function login(username: string, password: string): number | null {
  const user = db
    .prepare("SELECT id, password_hash FROM users WHERE username = ?")
    .get(username) as { id: number; password_hash: string } | undefined;
  if (!user) return null;
  return bcrypt.compareSync(password, user.password_hash) ? user.id : null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.userId) {
    next();
    return;
  }
  res.status(401).json({ error: "unauthenticated" });
}

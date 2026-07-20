import Database from "better-sqlite3";
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, "../../data");
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, "kanbanstyle.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/**
 * Alembic-style migration runner: applies every `NNN_description.sql` file
 * in `migrations/` that isn't yet recorded in `_migrations`, in filename order.
 * Never edit a migration that has already shipped — add a new numbered file instead.
 */
function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    db.prepare("SELECT name FROM _migrations").all().map((row) => (row as { name: string }).name),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    const apply = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
    });
    apply();
    console.log(`[migrations] applied ${file}`);
  }
}

runMigrations();

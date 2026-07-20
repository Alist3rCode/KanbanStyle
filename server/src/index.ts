import express from "express";
import session from "express-session";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import "./db.js";
import { ensureAdminUser, login, requireAuth } from "./auth.js";
import { boardsRouter } from "./routes/boards.js";
import { columnsRouter } from "./routes/columns.js";
import { cardsRouter } from "./routes/cards.js";
import { settingsRouter } from "./routes/settings.js";
import { jiraRouter } from "./routes/jira.js";
import { customFieldsRouter } from "./routes/customFields.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

ensureAdminUser();

const app = express();
app.use(express.json());

const sessionSecret = process.env.SESSION_SECRET ?? randomBytes(32).toString("hex");
if (!process.env.SESSION_SECRET) {
  console.warn("[auth] SESSION_SECRET not set — using a random secret (sessions reset on restart).");
}

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  const userId = username && password ? login(username, password) : null;
  if (!userId) {
    res.status(401).json({ error: "invalid credentials" });
    return;
  }
  req.session.userId = userId;
  res.status(204).end();
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.status(204).end());
});

app.get("/api/auth/me", (req, res) => {
  res.json({ authenticated: Boolean(req.session.userId) });
});

app.use(
  "/api",
  requireAuth,
  boardsRouter,
  columnsRouter,
  cardsRouter,
  settingsRouter,
  jiraRouter,
  customFieldsRouter,
);

const clientDist = process.env.CLIENT_DIST_DIR ?? path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`KanbanStyle server listening on http://localhost:${port}`);
});

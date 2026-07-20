# KanbanStyle

Alternative auto-hébergée et gratuite à Trello, sous forme de web app dockerisée.

## Développement local

```bash
pnpm install
pnpm dev
```

- Client (Vite) : http://localhost:5173
- Serveur (API) : http://localhost:3000

Au premier démarrage, si `ADMIN_PASSWORD` n'est pas défini, un mot de passe est généré et affiché une seule fois dans les logs du serveur.

## Déploiement (Docker)

```bash
cp .env.example .env   # renseigner ADMIN_PASSWORD et SESSION_SECRET
docker compose up -d
```

L'application est alors disponible sur http://localhost:3000. Les données (base SQLite) sont persistées dans le volume `kanbanstyle-data`.

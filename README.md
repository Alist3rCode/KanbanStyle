# KanbanStyle

Alternative auto-hébergée et gratuite à Trello, sous forme de web app dockerisée : un seul compte admin, une base SQLite, aucune dépendance externe à un compte tiers.

## Fonctionnalités

- **Tableaux Kanban** : colonnes et cartes réordonnables en drag & drop, colonnes "de fermeture" qui clôturent automatiquement les cartes qui y entrent.
- **Cartes** : description avec slash-commands (date, lien Jira, bloc de code), couverture (couleur unie, dégradé ou image), date d'échéance avec code couleur, checklists structurées (barre de progression), pièces jointes sans limite de taille, journal d'activité horodaté.
- **Étiquettes** : palette de couleurs par tableau, filtre rapide par étiquette sur le tableau.
- **Champs personnalisés** : modèle de champs par tableau (texte, date, lien, checklist, pièce jointe, lien Jira), auto-instanciés sur chaque nouvelle carte, éditables aussi bien dans le modèle du tableau que sur une carte individuelle.
- **Colonnes** : couleur d'en-tête personnalisable, reprise sur le badge de statut de la carte.
- **Recherche & filtres** : recherche texte (titre, description, champs), filtre par étiquette, masquage des cartes terminées / avec pièces jointes.
- **Intégration Jira** : coffre-fort de secrets chiffré (AES-256-GCM) pour stocker un token API et résoudre des liens de tickets directement dans les cartes.
- **Thème** : system / clair / sombre.

Le développement suit une feuille de route publique — voir les [issues du dépôt](https://github.com/Alist3rCode/KanbanStyle/issues) pour le détail des fonctionnalités livrées et à venir (vues Calendrier/Table, archivage, automatisation, export/import, etc.).

## Développement local

```bash
pnpm install
pnpm dev
```

- Client (Vite) : http://localhost:5173
- Serveur (API) : http://localhost:3000

Au premier démarrage, si `ADMIN_PASSWORD` n'est pas défini, un mot de passe est généré et affiché une seule fois dans les logs du serveur.

## Déploiement (Docker)

`docker-compose.yml` utilise l'image publiée automatiquement par la CI sur GitHub Container Registry à chaque push sur `main` — pas besoin de cloner le dépôt sur le serveur, seuls `docker-compose.yml` et `.env` sont nécessaires.

```bash
cp .env.example .env   # renseigner ADMIN_PASSWORD, SESSION_SECRET et ENCRYPTION_KEY
docker compose up -d
```

L'application est alors disponible sur http://localhost:3000. Les données (base SQLite, pièces jointes, images de couverture) sont persistées dans le volume `kanbanstyle-data`.

**Le paquet `ghcr.io/alist3rcode/kanbanstyle` est privé par défaut.** Avant le premier déploiement, choisir l'une des deux options :

- Rendre le paquet public une fois : sur GitHub, `Packages` → `kanbanstyle` → `Package settings` → `Change visibility` → `Public`.
- Ou s'authentifier sur le serveur avec un [token d'accès personnel](https://github.com/settings/tokens) ayant le scope `read:packages` : `docker login ghcr.io -u <utilisateur-github>`.

Variables d'environnement (`.env`) :

| Variable | Description |
| --- | --- |
| `ADMIN_USERNAME` | Identifiant du compte admin unique (défaut : `admin`). |
| `ADMIN_PASSWORD` | Mot de passe du compte admin. À définir avant le premier démarrage. |
| `SESSION_SECRET` | Secret de signature des cookies de session. Une longue chaîne aléatoire. |
| `ENCRYPTION_KEY` | Chiffre le coffre-fort de secrets (token Jira). À garder stable entre redéploiements, sous peine de rendre les secrets déjà enregistrés illisibles. |

Pour mettre à jour une instance existante : `docker compose pull && docker compose up -d`. Les migrations SQLite s'appliquent automatiquement au démarrage du conteneur.

Pour builder depuis les sources à la place (sur une machine avec le dépôt cloné), décommenter `build: .` dans `docker-compose.yml` à la place de `image:`.

## Stack technique

Monorepo pnpm : `client/` (Vite + React + TypeScript + Tailwind + shadcn/ui) et `server/` (Express + TypeScript + better-sqlite3), servis par un seul processus Node en production.

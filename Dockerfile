FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN pnpm install --frozen-lockfile

COPY client client
COPY server server
RUN pnpm --filter client build && pnpm --filter server build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

ENV CLIENT_DIST_DIR=/app/client/dist
ENV DATA_DIR=/app/data
EXPOSE 3000
CMD ["node", "server/dist/index.js"]

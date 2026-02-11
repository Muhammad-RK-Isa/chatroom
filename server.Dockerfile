FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS pruner
COPY . .
RUN bun add -g turbo@latest
RUN turbo prune --scope=@chatroom/server --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json .
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/turbo.json ./turbo.json
RUN bun install --no-frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full .
RUN bun run build --filter "@chatroom/server"

FROM base AS runner

WORKDIR /app
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/bun.lock ./bun.lock

EXPOSE 8000

CMD ["bun", "run", "dist/index.js"]

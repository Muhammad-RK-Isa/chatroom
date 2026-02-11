FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS pruner
COPY . .
RUN bun add -g turbo@latest
RUN turbo prune --scope=@chatroom/web --docker

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
RUN bun run build --filter "@chatroom/web"

FROM base AS runner

WORKDIR /app
COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/apps/web/server.ts ./server.ts
COPY --from=builder /app/apps/web/package.json ./package.json

EXPOSE 3000

CMD ["bun", "run", "server.ts"]

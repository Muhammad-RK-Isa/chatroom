FROM oven/bun AS base
WORKDIR /app

FROM base AS prune
COPY . .
RUN bun add -g turbo
RUN turbo prune --scope=@chatroom/server --docker

FROM base AS build
WORKDIR /app
COPY --from=prune /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=prune /app/out/full/ .
RUN bun run build --filter=@chatroom/server

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/server/dist ./apps/server/dist
CMD ["bun", "run", "apps/server/dist/index.js"]

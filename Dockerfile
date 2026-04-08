FROM oven/bun:1 AS base
WORKDIR /app

# Install deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Build frontend (VITE_ANALYTICS_ENDPOINT is baked in at build time)
ARG VITE_ANALYTICS_ENDPOINT=https://analytics.nubisco.io/collect
ENV VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT
COPY . .
RUN bun run build

# Prune to production deps
RUN bun install --frozen-lockfile --production

FROM oven/bun:1-slim AS runner
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/server ./server
COPY --from=base /app/shared ./shared
COPY --from=base /app/package.json ./package.json

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "run", "server/index.ts"]

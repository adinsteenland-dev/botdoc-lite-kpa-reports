# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN bun run build
RUN bun build scripts/send-emails.ts --outfile cron/send-emails.js --target node --format cjs

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Next.js standalone output bundles everything it needs; copy the three dirs.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Drizzle migrations must be available at runtime for instrumentation.ts.
COPY --from=builder /app/src/infrastructure/db/migrations ./src/infrastructure/db/migrations

# CLI entrypoint for K8s CronJob (send scheduled emails without HTTP).
COPY --from=builder /app/cron ./cron

EXPOSE 3000

CMD ["node", "server.js"]

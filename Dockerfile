FROM oven/bun:1 AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN bunx prisma generate
RUN bun run build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/.next/standalone ./

# Copy Prisma CLI + engine for runtime db push
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema for runtime migrations
COPY --from=builder /app/prisma ./prisma

# Copy static assets
COPY --from=builder /app/.next/static ./.next/static

# Copy public (icons, manifest, service worker, uploads)
COPY --from=builder /app/public ./public

# Copy entrypoint
COPY --from=builder /app/docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh
RUN mkdir -p public/uploads prisma

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
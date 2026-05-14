# ═══════════════════════════════════════════════════════════════════
# SEOMaster - Production Dockerfile
# Multi-stage build for optimized production image
# Supports: Docker Compose, Railway, Render, Fly.io
# ═══════════════════════════════════════════════════════════════════

# ─── Base Stage ───────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ─── Dependencies Stage ───────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# ─── Builder Stage ────────────────────────────────────────────────────
FROM base AS builder
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# Build arguments
ARG DATABASE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG ANTHROPIC_AUTH_TOKEN
ARG MINIMAX_AUTH_TOKEN
ARG MINIMAX_BASE_URL
ARG GEMINI_API_KEY
ARG REDIS_URL
ARG STRIPE_SECRET_KEY
ARG CRON_SECRET

ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV ANTHROPIC_AUTH_TOKEN=${ANTHROPIC_AUTH_TOKEN}
ENV MINIMAX_AUTH_TOKEN=${MINIMAX_AUTH_TOKEN}
ENV MINIMAX_BASE_URL=${MINIMAX_BASE_URL}
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
ENV REDIS_URL=${REDIS_URL}
ENV STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
ENV CRON_SECRET=${CRON_SECRET}

RUN npm run build

# ─── Runner Stage ─────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Install production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs package.json ./

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "server.js"]

# ═══════════════════════════════════════════════════════════════════
# Worker Dockerfile (separate service for background jobs)
# Build: docker build -t seomaster-worker --target worker .
# ═══════════════════════════════════════════════════════════════════
FROM base AS worker

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
COPY scripts/worker.ts ./scripts/

ENV NODE_ENV=production

USER node

CMD ["npx", "tsx", "scripts/worker.ts"]

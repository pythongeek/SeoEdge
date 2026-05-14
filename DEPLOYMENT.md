# SEOMaster - Deployment Guide

> Production-ready deployment instructions for Docker, Railway, Render, and GitHub.

## Table of Contents

- [Quick Deploy with Docker Compose](#quick-deploy-with-docker-compose)
- [Railway Deployment](#railway-deployment)
- [Render Deployment](#render-deployment)
- [GitHub Setup](#github-setup)
- [Required Services](#required-services)
- [Environment Variables](#environment-variables)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

---

## Quick Deploy with Docker Compose

### Prerequisites

- Docker 24+ and Docker Compose v2+
- 4GB RAM minimum, 8GB recommended

### Steps

```bash
# 1. Clone repository
git clone https://github.com/yourusername/seomaster.git
cd seomaster

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Launch all services
docker-compose up -d

# 4. Run database migrations
docker-compose exec app npx drizzle-kit push

# 5. Verify health
curl http://localhost:3000/api/v1/health
```

### Services

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| Next.js App | `seomaster-app` | 3000 | Main application |
| Worker | `seomaster-worker` | - | Background job processor |
| Cron | `seomaster-cron` | - | Scheduled task runner |
| PostgreSQL | `seomaster-db` | 5432 | Primary database |
| Redis | `seomaster-redis` | 6379 | Cache + job queue |

### Scaling Workers

```bash
# Scale to 3 workers
docker-compose up -d --scale worker=3

# View worker logs
docker-compose logs -f worker
```

---

## Railway Deployment

### 1. Connect Repository

1. Sign up at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Select your SEOMaster repo
4. Railway auto-detects `Dockerfile`

### 2. Add PostgreSQL

```
New → Database → Add PostgreSQL
```
Railway automatically sets `DATABASE_URL`.

### 3. Add Redis

```
New → Database → Add Redis
```
Railway automatically sets `REDIS_URL`.

### 4. Configure Environment Variables

In Railway Dashboard → Variables, add:

```env
NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
MINIMAX_AUTH_TOKEN=sk-cp-your-token
MINIMAX_BASE_URL=https://api.minimax.chat/v1
GEMINI_API_KEY=your-gemini-key
ENCRYPTION_KEY=your-32-char-key
CRON_SECRET=your-cron-secret
```

### 5. Deploy Worker

Add a separate service for the worker:

```
New → Service → GitHub Repo → Same repo
Start Command: npx tsx scripts/worker.ts
```

### 6. Deploy Cron Runner

```
New → Service → GitHub Repo → Same repo
Start Command: npx tsx scripts/cron-runner.ts
```

### 7. Set Custom Domain (Optional)

```
Settings → Domains → Generate Domain
# or
Custom Domain → Add your domain
```

Update `NEXT_PUBLIC_APP_URL` and `GSC_REDIRECT_URI` with the new domain.

---

## Render Deployment

### 1. Create Blueprint

Create `render.yaml` in your repo root:

```yaml
services:
  - type: web
    name: seomaster-app
    runtime: node
    plan: standard
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: seomaster-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: seomaster-redis
          property: connectionString

  - type: worker
    name: seomaster-worker
    runtime: node
    plan: standard
    buildCommand: npm install
    startCommand: npx tsx scripts/worker.ts
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: seomaster-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: seomaster-redis
          property: connectionString

databases:
  - name: seomaster-db
    plan: starter
    ipAllowList: []

redis:
  - name: seomaster-redis
    plan: starter
    ipAllowList: []
```

### 2. Deploy

1. Sign up at [render.com](https://render.com)
2. New → Blueprint → Connect your repo
3. Render detects `render.yaml` and deploys all services

---

## GitHub Setup

### 1. Create Repository

```bash
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial SEOMaster production release"

# Add remote (replace with your repo)
git remote add origin https://github.com/yourusername/seomaster.git

# Push
git push -u origin main
```

### 2. Configure Repository Secrets

Go to Settings → Secrets and variables → Actions:

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Production database URL |
| `REDIS_URL` | Production Redis URL |
| `CLERK_SECRET_KEY` | Clerk secret |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `MINIMAX_AUTH_TOKEN` | MiniMax API key |
| `GEMINI_API_KEY` | Gemini API key |
| `STRIPE_SECRET_KEY` | Stripe secret |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |

### 3. Configure Repository Variables

Go to Settings → Secrets and variables → Variables:

| Variable | Value |
|----------|-------|
| `DEPLOY_TARGET` | `railway` or `render` |
| `NEXT_PUBLIC_APP_URL` | Your production URL |

### 4. Enable CI/CD

The `.github/workflows/ci.yml` automatically runs on push to `main`.

---

## Required Services

### Clerk (Authentication)

1. Sign up at [clerk.com](https://clerk.com)
2. Create application
3. Copy **Publishable key** and **Secret key**
4. Configure redirect URLs:
   - `http://localhost:3000/sign-in` (dev)
   - `https://your-app.com/sign-in` (prod)
5. Add webhook endpoint: `https://your-app.com/api/clerk-webhook`
6. Copy webhook signing secret

### MiniMax (Primary AI)

1. Sign up at [api.minimax.chat](https://api.minimax.chat/)
2. Create API key
3. Copy token (starts with `sk-cp-`)
4. Base URL: `https://api.minimax.chat/v1`

### Gemini (Fallback AI)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create API key
3. Copy key

### Stripe (Billing - Optional)

1. Sign up at [stripe.com](https://stripe.com)
2. Create products:
   - Pro plan → Price ID
   - Business plan → Price ID
3. Configure webhook endpoint: `https://your-app.com/api/stripe-webhook`
4. Copy webhook signing secret

### Sentry (Error Tracking - Optional)

1. Sign up at [sentry.io](https://sentry.io)
2. Create Next.js project
3. Copy DSN
4. Set `NEXT_PUBLIC_SENTRY_DSN`

### PostHog (Analytics - Optional)

1. Sign up at [posthog.com](https://posthog.com)
2. Create project
3. Copy API key (starts with `phc_`)
4. Set `NEXT_PUBLIC_POSTHOG_KEY`

### Redis (Required for Background Jobs)

**Option A: Railway Redis (Free tier: 500MB)**
1. Railway dashboard → New → Redis
2. Copy connection string

**Option B: Upstash Redis (Free tier: 10k commands/day)**
1. Sign up at [upstash.com](https://upstash.com)
2. Create database
3. Copy REST URL and token

**Option C: Self-hosted (Docker)**
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### PostgreSQL (Required)

**Option A: Neon (Free tier: 500MB)**
1. Sign up at [neon.tech](https://neon.tech)
2. Create project
3. Copy connection string

**Option B: Railway PostgreSQL**
1. Railway dashboard → New → PostgreSQL
2. Copy connection string

**Option C: Self-hosted (Docker)**
```bash
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=seomaster \
  -p 5432:5432 \
  postgres:16-alpine
```

---

## Environment Variables

### Required (App won't start without these)

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk dashboard |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook settings |
| `MINIMAX_AUTH_TOKEN` | MiniMax dashboard |
| `ENCRYPTION_KEY` | Generate: `openssl rand -hex 16` |
| `NEXT_PUBLIC_APP_URL` | Your app URL |

### Required for Billing

| Variable | Source |
|----------|--------|
| `STRIPE_SECRET_KEY` | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook settings |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | Stripe product |
| `NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID` | Stripe product |

### Required for GSC API

| Variable | Source |
|----------|--------|
| `GSC_CLIENT_ID` | Google Cloud Console |
| `GSC_CLIENT_SECRET` | Google Cloud Console |
| `GSC_REDIRECT_URI` | Your app + `/api/gsc/oauth?action=callback` |

### Optional (Feature-gated)

| Variable | Source | Feature |
|----------|--------|---------|
| `GEMINI_API_KEY` | Google AI Studio | AI fallback |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry dashboard | Error tracking |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog dashboard | Analytics |

---

## Post-Deployment

### 1. Verify Health

```bash
curl https://your-app.com/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" },
    "ai_engine": { "status": "ok" }
  }
}
```

### 2. Verify External API

```bash
curl https://your-app.com/api/v1/openapi.json
```

### 3. Test AI Analysis

```bash
curl -X POST https://your-app.com/api/v1/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "action": "content_plan",
    "data": {
      "keywords": ["seo tools", "technical seo", "on-page optimization"],
      "siteUrl": "https://example.com"
    }
  }'
```

### 4. Configure Webhooks (Optional)

For n8n integration:
1. In SEOMaster dashboard → Settings → API Keys
2. Generate API key
3. In n8n: HTTP Request node → Header Auth → `X-API-Key`

### 5. Set Up Scheduled Reports

1. In SEOMaster dashboard → Settings → Reports
2. Configure frequency (weekly/monthly)
3. Add recipient emails
4. Reports auto-generate via cron service

---

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
docker-compose exec postgres psql -U seomaster -d seomaster -c "SELECT 1"

# View logs
docker-compose logs postgres

# Reset (WARNING: destroys data)
docker-compose down -v
docker-compose up -d postgres
```

### Redis Connection Issues

```bash
# Test connection
docker-compose exec redis redis-cli ping

# View logs
docker-compose logs redis

# Reset
docker-compose restart redis
```

### Worker Not Processing Jobs

```bash
# Check worker logs
docker-compose logs -f worker

# Restart worker
docker-compose restart worker

# Verify Redis queue
docker-compose exec redis redis-cli LRANGE seo-jobs:pending 0 -1
```

### AI API Errors

```bash
# Test MiniMax API directly
curl https://api.minimax.chat/v1/chat/completions \
  -H "Authorization: Bearer $MINIMAX_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"MiniMax-M2.7","messages":[{"role":"user","content":"Hello"}]}'

# Test Gemini API
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Clerk Auth Issues

1. Verify `CLERK_SECRET_KEY` is correct
2. Check webhook URL is accessible
3. Ensure redirect URLs are configured in Clerk dashboard
4. Check `NEXT_PUBLIC_APP_URL` matches actual URL

---

## Architecture Diagram

```
                    ┌─────────────┐
                    │   User      │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌────▼─────┐ ┌───▼────┐
        │   n8n     │ │ Dashboard│ │  API   │
        │ (webhook) │ │   (UI)   │ │ (cron) │
        └─────┬─────┘ └────┬─────┘ └───┬────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼──────┐
                    │  Next.js    │
                    │   App       │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌────▼─────┐ ┌───▼────┐
        │  BullMQ   │ │ Drizzle  │ │ Stripe │
        │  Queue    │ │   ORM    │ │  API   │
        └─────┬─────┘ └────┬─────┘ └───┬────┘
              │            │            │
        ┌─────▼─────┐ ┌────▼─────┐    │
        │  Worker   │ │ PostgreSQL│    │
        │  Service  │ │   16     │    │
        └─────┬─────┘ └──────────┘    │
              │                        │
        ┌─────▼─────┐                  │
        │  MiniMax  │                  │
        │  M2.7 API │                  │
        │ (Primary) │                  │
        └───────────┘                  │
        ┌───────────┐                  │
        │  Gemini   │                  │
        │ (Fallback)│                  │
        └───────────┘                  │
                                       │
                                  ┌────▼────┐
                                  │  Clerk  │
                                  │  Auth   │
                                  └─────────┘
```

## Support

- GitHub Issues: [github.com/yourusername/seomaster/issues](https://github.com/yourusername/seomaster/issues)
- Documentation: [github.com/yourusername/seomaster/wiki](https://github.com/yourusername/seomaster/wiki)

# SEOMaster

[![CI/CD](https://github.com/yourusername/seomaster/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/seomaster/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://hub.docker.com)

> Enterprise-grade AI-powered SEO analytics platform built for agencies and professionals.

## Features

| Feature | Description |
|---------|-------------|
| **AI-Powered Analysis** | MiniMax M2.7 + Gemini dual-engine with structured Zod output validation |
| **Harnedd Agent** | Multi-agent reasoning system (SEO Analyst, Content Strategist, Technical Auditor, GEO Specialist) |
| **GSC Integration** | OAuth + Service Account support with encrypted token storage |
| **Background Processing** | BullMQ job queue with retry logic, dead letter queues, and worker isolation |
| **Multi-Tenancy** | Workspace-based isolation with RBAC (Owner/Admin/Member) |
| **Billing** | Stripe integration with Free/Pro/Business tiers |
| **External API** | n8n-compatible REST API with OpenAPI spec and API key authentication |
| **Observability** | Sentry error tracking + PostHog product analytics |
| **Scheduled Reports** | node-cron based scheduling (no Vercel dependency) |
| **Self-Hostable** | Docker Compose setup with PostgreSQL + Redis |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache/Queue | Redis 7 + BullMQ |
| AI Engine | MiniMax M2.7 (primary) + Gemini 2.0 Flash (fallback) |
| Auth | Clerk |
| Billing | Stripe |
| Monitoring | Sentry + PostHog |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Neon serverless)
- Redis 7+ (or Railway/Upstash)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/seomaster.git
cd seomaster
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

### 3. Database Setup

```bash
# Push schema to database
npm run db:push

# Or use Docker Compose for local development
docker-compose up -d postgres redis
```

### 4. Run Development Server

```bash
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: Background worker
npm run worker

# Terminal 3: Cron scheduler (optional)
npx tsx scripts/cron-runner.ts
```

Open [http://localhost:3000](http://localhost:3000)

## Docker Deployment

### Full Stack (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Scale workers
docker-compose up -d --scale worker=3
```

### Production Build

```bash
# Build image
docker build -t seomaster:latest .

# Run
docker run -p 3000:3000 --env-file .env.local seomaster:latest
```

## AI Configuration

### MiniMax M2.7 (Primary)

1. Sign up at [MiniMax](https://api.minimax.chat/)
2. Get your API key from the dashboard
3. Set `MINIMAX_AUTH_TOKEN=sk-cp-your-token`
4. Set `MINIMAX_BASE_URL=https://api.minimax.chat/v1`

### Gemini (Fallback)

1. Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Set `GEMINI_API_KEY=your-key`

### Harnedd Agent Modes

| Agent Type | Use Case | Reasoning Depth |
|-----------|----------|----------------|
| `seo_analyst` | CTR analysis, cannibalization, health audits | Standard/Deep |
| `content_strategist` | Content plans, topic clustering | Standard/Deep |
| `technical_auditor` | Core Web Vitals, technical SEO | Deep |
| `geo_specialist` | AI Overview risk, GEO optimization | Deep |

## External API (n8n Integration)

### Authentication

All requests require an `X-API-Key` header.

### n8n HTTP Request Node Setup

```
Method: POST
URL: https://your-app.com/api/v1/analyze
Authentication: Generic Auth Type > Header Auth
Headers:
  X-API-Key: your-api-key
Body (JSON):
  {
    "action": "full_audit",
    "siteUrl": "https://example.com"
  }
```

### OpenAPI Spec

Access the OpenAPI spec at `/api/v1/openapi.json` for auto-generated documentation.

## Architecture

```
User → Next.js App → API Routes → Drizzle ORM → PostgreSQL
                    ↓
              BullMQ Queue → Worker → MiniMax/Gemini AI
                    ↓
              Redis (Cache + Queue)
```

### Background Jobs

| Job Type | Description | Priority |
|----------|-------------|----------|
| `gsc_analysis` | GSC data fetch + analysis | 2 |
| `ai_analysis` | AI-powered deep analysis | 3 |
| `scheduled_report` | Automated report generation | 3 |
| `export` | DOCX/CSV export | 4 |

### Cron Jobs (node-cron)

| Schedule | Task |
|----------|------|
| `0 9 * * 1` | Process scheduled reports (weekly) |
| `0 6 * * *` | Sync GSC data (daily) |
| `0 2 * * 0` | Cleanup old jobs (weekly) |
| `0 0 1 * *` | Reset monthly token quotas |
| `*/5 * * * *` | Health check (every 5 min) |

## Environment Variables

See [`.env.example`](.env.example) for all available configuration options.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `MINIMAX_AUTH_TOKEN` | MiniMax API key |
| `NEXT_PUBLIC_APP_URL` | Application URL |
| `ENCRYPTION_KEY` | 32-character encryption key |

## Database Schema

| Table | Purpose |
|-------|---------|
| `workspaces` | Multi-tenant workspace isolation |
| `users` | User accounts (Clerk sync) |
| `workspace_members` | RBAC membership |
| `sites` | Connected websites |
| `gsc_snapshots` | GSC data storage |
| `seo_reports` | AI-generated reports |
| `opportunities` | Prioritized SEO opportunities |
| `scheduled_reports` | Automated report scheduling |
| `jobs` | Background job tracking |
| `activity_log` | Audit trail |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Documentation: [Wiki](https://github.com/yourusername/seomaster/wiki)
- Issues: [GitHub Issues](https://github.com/yourusername/seomaster/issues)
- Discussions: [GitHub Discussions](https://github.com/yourusername/seomaster/discussions)

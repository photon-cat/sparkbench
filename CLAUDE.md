# SparkBench — CLAUDE.md

## What is this
Hardware development platform: code editor + circuit simulator + PCB designer + AI agent. Users write Arduino firmware, simulate on avr8js (ATmega328P @ 16MHz), design KiCad PCBs, and debug with Sparky AI.

## Environment
- **This is the dev/production server** (OVH VPS, Ubuntu, `vps-7d69359c`)
- **No Node.js installed on the host** — the app runs inside Docker
- Branch: `dev-deploy` (deploy branch). Main dev branch: `dev`
- Repo: `github.com/photon-cat/sparkbench`
- Docker Compose runs 3 containers: `sparkbench-app-1`, `sparkbench-postgres-1`, `sparkbench-minio-1`
- To deploy changes: commit, push, then `docker compose -f docker-compose.prod.yml up --build -d`

## Tech stack
- Next.js (App Router), React 19, TypeScript
- PostgreSQL 16 + Drizzle ORM
- MinIO (S3-compatible object storage for project files)
- Better-Auth (Google OAuth)
- PlatformIO (Arduino firmware compilation)
- avr8js (in-browser AVR simulation)
- Claude Agent SDK + MCP (Sparky AI agent)
- Monaco editor, Three.js, KiCanvas

## Key paths
- `app/` — Next.js App Router pages and API routes
- `app/api/projects/route.ts` — project list & create API
- `app/api/chat/route.ts` — Sparky AI chat endpoint
- `app/dashboard/` — homepage tabs (projects, mine, starred)
- `components/` — React components (SparkyChat, Toolbar, etc.)
- `lib/db/schema.ts` — Drizzle schema (users, projects, projectStars, builds, etc.)
- `lib/api.ts` — client-side API helpers and types (ProjectMeta, etc.)
- `lib/auth.ts` — Better-Auth config
- `lib/storage.ts` — MinIO file operations
- `lib/sandbox.ts` — sandboxed PlatformIO builds
- `docker-compose.prod.yml` — production Docker Compose
- `Dockerfile` — multi-stage build (deps → builder → runner)
- `docker-entrypoint.sh` — sets up Claude Code credentials at runtime

## Database
- PostgreSQL via Drizzle. Schema in `lib/db/schema.ts`
- Key tables: `users`, `projects`, `project_stars`, `builds`, `activity_logs`, `sessions`, `accounts`
- Migrations: `npm run db:push` (inside container) or `drizzle-kit push`

## Common commands (run on host)
```bash
# Rebuild and restart the app
docker compose -f docker-compose.prod.yml up --build -d

# View app logs
docker compose -f docker-compose.prod.yml logs -f app

# Access postgres
docker compose -f docker-compose.prod.yml exec postgres psql -U sparkbench

# Check container status
docker ps
```

## Notes
- No local Node/npm — cannot run `tsc`, `npm run dev`, tests, etc. on the host
- App is exposed on port 3000
- `.env` contains secrets — never commit it
- Allowed AI models: Haiku 4.5, Sonnet 4.6 (Opus removed from allowed list)
- Default user usage limit: $10/month
- `SANDBOX_ENABLED=false` in prod (builds run directly in app container)

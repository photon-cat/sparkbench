# SparkBench Production Deployment

## Prerequisites

- Docker Engine 24+ with Compose v2
- Domain name (optional, for SSL)
- Google OAuth credentials (optional, for social login)
- Anthropic API key (for Sparky AI agent)

## Quick Start

```bash
git clone <repo-url> && cd sparkbench
./deploy.sh
```

On first run the script creates `.env` from `.env.example` and exits — edit the file with your secrets, then re-run `./deploy.sh`.

## Architecture

```
                    ┌─────────────────────────────┐
                    │         reverse proxy        │
                    │      (nginx / caddy / etc)   │
                    │         :80 / :443           │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │        sparkbench-app        │
                    │     Next.js standalone       │
                    │          :3000               │
                    │  + PlatformIO (AVR builds)   │
                    └──────┬──────────────┬───────┘
                           │              │
              ┌────────────▼──┐    ┌──────▼────────┐
              │   postgres    │    │     minio      │
              │    :5432      │    │  :9000 / :9001 │
              │   pgdata vol  │    │ miniodata vol  │
              └───────────────┘    └───────────────┘
```

## Environment Variables

### Required

| Variable | Build/Runtime | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | Runtime | Database password |
| `BETTER_AUTH_SECRET` | Runtime | Session signing secret (random 32+ chars) |
| `NEXT_PUBLIC_APP_URL` | **Build time** | Public URL (e.g. `https://sparkbench.example.com`). Baked into JS bundle. |
| `ANTHROPIC_API_KEY` | Runtime | Anthropic API key for Sparky AI |

### Optional

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `sparkbench` | Database user |
| `POSTGRES_DB` | `sparkbench` | Database name |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin123` | MinIO secret key (change in prod!) |
| `MINIO_BUCKET` | `sparkbench` | MinIO bucket name |
| `MINIO_USE_SSL` | `false` | Set `true` if MinIO is behind TLS |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `DEEPPCB_API_KEY` | — | DeepPCB autorouter (enables "Route with DeepPCB") |
| `SANDBOX_ENABLED` | `false` | Use Docker sandbox for builds (see below) |
| `SANDBOX_IMAGE` | `sparkbench-sandbox:latest` | Sandbox container image |
| `SANDBOX_RUNTIME` | — | Container runtime (`sysbox-runc`, `runsc`) |

### Build-time vs Runtime

`NEXT_PUBLIC_APP_URL` is a Next.js public env var — it gets compiled into the client JavaScript bundle during `next build`. You **must** set it before building the Docker image (it's passed as a build arg in the compose file). All other variables are runtime-only.

## Build Modes

### Direct Mode (default)

PlatformIO runs inside the app container. Simple, no extra setup.

```yaml
SANDBOX_ENABLED: "false"   # default
```

### Sandbox Mode

Each build runs in an isolated Docker container with network disabled, read-only filesystem, memory/CPU limits. Recommended for multi-tenant deployments.

```yaml
SANDBOX_ENABLED: "true"
```

Requirements for sandbox mode:
- Mount Docker socket: add `- /var/run/docker.sock:/var/run/docker.sock` to the app service volumes
- Build the sandbox image: `docker compose -f docker-compose.prod.yml --profile build build`
- Optional: set `SANDBOX_RUNTIME` for additional isolation (gVisor, Sysbox)

## SSL / Reverse Proxy

The app listens on port 3000 (HTTP). For production, put a reverse proxy in front:

**Caddy (automatic HTTPS):**
```
sparkbench.example.com {
    reverse_proxy app:3000
}
```

**Nginx:**
```nginx
server {
    listen 443 ssl;
    server_name sparkbench.example.com;

    ssl_certificate     /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Updating

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

The build step re-runs `next build` and applies any schema changes automatically. Data in postgres and minio persists across rebuilds via Docker volumes.

## Common Operations

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f app

# Stop everything
docker compose -f docker-compose.prod.yml down

# Stop and remove volumes (DELETES ALL DATA)
docker compose -f docker-compose.prod.yml down -v

# Run DB migrations manually
docker compose -f docker-compose.prod.yml exec app npx drizzle-kit push

# Check activity log
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U sparkbench -d sparkbench \
  -c "SELECT action, count(*) FROM activity_log GROUP BY action ORDER BY count DESC;"

# Shell into app container
docker compose -f docker-compose.prod.yml exec app sh
```

## Troubleshooting

**"NEXT_PUBLIC_APP_URL is localhost in production"**
This var is baked in at build time. Rebuild the image: `docker compose -f docker-compose.prod.yml build --no-cache app`

**Build fails with "platformio: not found"**
PlatformIO is installed in the Docker image. If running outside Docker, install it: `pip install platformio && platformio platform install atmelavr`

**MinIO connection refused**
Check that `MINIO_ENDPOINT` is set to `minio` (the Docker service name) in production, not `localhost`.

**Google OAuth redirect mismatch**
Ensure `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` match your public domain, and that the domain is registered in the Google Cloud Console authorized redirect URIs.

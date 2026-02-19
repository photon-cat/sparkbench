#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[deploy]${NC} $*"; }
error() { echo -e "${RED}[deploy]${NC} $*" >&2; }

# ── 1. Check prerequisites ──
info "Checking prerequisites..."

if ! command -v docker &>/dev/null; then
  error "docker is not installed. Install Docker: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version &>/dev/null; then
  error "docker compose (v2) is not available. Update Docker or install the compose plugin."
  exit 1
fi

# ── 2. Ensure .env exists ──
if [ ! -f "$ENV_FILE" ]; then
  warn ".env file not found. Copying from .env.example..."
  cp .env.example "$ENV_FILE"
  warn ""
  warn "  ╔══════════════════════════════════════════════════════════╗"
  warn "  ║  IMPORTANT: Edit .env with your production secrets      ║"
  warn "  ║  At minimum set:                                        ║"
  warn "  ║    - POSTGRES_PASSWORD                                  ║"
  warn "  ║    - MINIO_SECRET_KEY                                   ║"
  warn "  ║    - BETTER_AUTH_SECRET                                 ║"
  warn "  ║    - NEXT_PUBLIC_APP_URL                                ║"
  warn "  ║    - ANTHROPIC_API_KEY                                  ║"
  warn "  ╚══════════════════════════════════════════════════════════╝"
  warn ""
  warn "Then re-run: ./deploy.sh"
  exit 1
fi

# Source .env for variable access in this script
set -a
source "$ENV_FILE"
set +a

# ── 3. Validate required vars ──
MISSING=()
[ -z "${POSTGRES_PASSWORD:-}" ] && MISSING+=("POSTGRES_PASSWORD")
[ -z "${MINIO_SECRET_KEY:-}" ] && MISSING+=("MINIO_SECRET_KEY")
[ -z "${MINIO_ACCESS_KEY:-}" ] && MISSING+=("MINIO_ACCESS_KEY")
[ -z "${BETTER_AUTH_SECRET:-}" ] && MISSING+=("BETTER_AUTH_SECRET")

# Reject known weak/default values
WEAK=()
[ "${POSTGRES_PASSWORD:-}" = "sparkbench_dev" ] && WEAK+=("POSTGRES_PASSWORD (still using default)")
[ "${MINIO_SECRET_KEY:-}" = "minioadmin123" ] && WEAK+=("MINIO_SECRET_KEY (still using default)")
[ "${BETTER_AUTH_SECRET:-}" = "change-me-to-a-random-secret" ] && WEAK+=("BETTER_AUTH_SECRET (still using default)")

if [ ${#MISSING[@]} -gt 0 ]; then
  error "Missing required environment variables in .env:"
  for var in "${MISSING[@]}"; do
    error "  - $var"
  done
  exit 1
fi

if [ ${#WEAK[@]} -gt 0 ]; then
  error "Weak/default credentials detected in .env — change these before deploying:"
  for var in "${WEAK[@]}"; do
    error "  - $var"
  done
  error ""
  error "Generate strong secrets with: openssl rand -base64 32"
  exit 1
fi

# ── 4. Build images ──
info "Building Docker images..."
docker compose -f "$COMPOSE_FILE" build

# ── 5. Start database + storage ──
info "Starting postgres and minio..."
docker compose -f "$COMPOSE_FILE" up -d postgres minio

info "Waiting for postgres to be ready..."
until docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-sparkbench}" &>/dev/null; do
  sleep 1
done
info "Postgres is ready."

info "Waiting for minio to be ready..."
sleep 3  # MinIO health check takes a moment

# ── 6. Run database migrations ──
info "Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm \
  -e DATABASE_URL="postgresql://${POSTGRES_USER:-sparkbench}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-sparkbench}" \
  app npx drizzle-kit push --force 2>/dev/null || {
    warn "drizzle-kit push had issues (may be fine if tables already exist)"
  }

# ── 7. Start the app ──
info "Starting SparkBench..."
docker compose -f "$COMPOSE_FILE" up -d

# ── 8. Print status ──
echo ""
info "================================================"
info "  SparkBench is running!"
info "================================================"
echo ""
info "  App:           ${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
info "  MinIO Console: http://localhost:9001"
echo ""
info "  Useful commands:"
info "    Logs:    docker compose -f $COMPOSE_FILE logs -f app"
info "    Stop:    docker compose -f $COMPOSE_FILE down"
info "    Rebuild: docker compose -f $COMPOSE_FILE up -d --build"
echo ""

docker compose -f "$COMPOSE_FILE" ps

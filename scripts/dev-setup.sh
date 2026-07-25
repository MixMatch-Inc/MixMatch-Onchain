#\!/usr/bin/env bash
# MixMatch Developer Setup Script
# Automates the Quick Start from docs/DEVELOPER_ONBOARDING.md
set -euo pipefail

RED="\033[0;31m"; GREEN="\033[0;32m"; YELLOW="\033[1;33m"; NC="\033[0m"
info()    { echo -e "${GREEN}[setup]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC}  $*"; }
error()   { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

require_cmd() { command -v "$1" &>/dev/null || error "'$1' not found. $2"; }

info "Checking prerequisites..."
require_cmd node  "Install Node.js 20+ from https://nodejs.org"
require_cmd pnpm  "Run: corepack enable && corepack prepare pnpm@latest --activate"
require_cmd docker "Install Docker from https://docs.docker.com/get-docker"

NODE_MAJOR=$(node --version | cut -d. -f1 | tr -d "v")
[ "$NODE_MAJOR" -ge 20 ] || error "Node.js 20+ required (found $(node --version))"
info "Node.js $(node --version) — OK"

info "Installing dependencies..."
pnpm install

info "Starting PostgreSQL container..."
if \! docker ps -q -f name=mixmatch-postgres | grep -q .; then
  if docker ps -aq -f name=mixmatch-postgres | grep -q .; then
    docker start mixmatch-postgres
  else
    docker run --name mixmatch-postgres \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=mixmatch \
      -p 5432:5432 -d postgres:16
    info "Waiting for PostgreSQL to be ready..."
    sleep 3
  fi
else
  info "PostgreSQL already running — skipping"
fi

info "Configuring environment..."
[ -f apps/api/.env ]  || cp apps/api/.env.example  apps/api/.env
[ -f apps/web/.env ]  || { [ -f apps/web/.env.example ] && cp apps/web/.env.example apps/web/.env; }

if \! grep -qE "^JWT_SECRET=.{32}" apps/api/.env 2>/dev/null; then
  warn "JWT_SECRET not set or too short. Generating one..."
  SECRET=$(openssl rand -hex 32)
  if grep -q "^JWT_SECRET=" apps/api/.env; then
    sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=${SECRET}/" apps/api/.env && rm -f apps/api/.env.bak
  else
    echo "JWT_SECRET=${SECRET}" >> apps/api/.env
  fi
  info "JWT_SECRET written to apps/api/.env"
fi

info "Running database migrations..."
(cd apps/api && pnpm prisma migrate deploy 2>/dev/null || pnpm prisma migrate dev --name init)

info ""
info "Setup complete. Start dev servers with:"
info "  pnpm dev"
info ""
info "API → http://localhost:3001"
info "Web → http://localhost:3000"

#!/usr/bin/env bash
# Starts Postgres, the FastAPI backend (with reload) and the JavaScript dev servers together.
# Ctrl-C stops everything it started. Usage: scripts/dev.sh   (or: make dev)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

[ -x apps/api-py/.venv/bin/uvicorn ] || { echo "error: run 'make setup' first." >&2; exit 1; }

docker compose up -d --wait postgres

(
  cd apps/api-py
  exec .venv/bin/uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
) &
API_PID=$!
trap 'kill "$API_PID" 2>/dev/null || true' EXIT INT TERM

# turbo's `dev` task starts web and mobile; it does not start the Python API, hence the line above.
pnpm dev

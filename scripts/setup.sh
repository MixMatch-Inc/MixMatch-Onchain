#!/usr/bin/env bash
# One-command developer setup: checks prerequisites, creates env files from the templates,
# installs JavaScript and Python dependencies, starts Postgres and creates the database schema.
# Safe to re-run. Usage: scripts/setup.sh   (or: make setup)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "error: '$1' is required but was not found. $2" >&2; exit 1; }
}

need node "Install Node.js 20 (see .nvmrc)."
need pnpm "Install pnpm 9: https://pnpm.io/installation"
need python3 "Install Python 3.11 (see .python-version)."
need docker "Install Docker with the Compose plugin."
docker compose version >/dev/null 2>&1 || { echo "error: the Docker Compose plugin is required." >&2; exit 1; }

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" != "$(tr -d '[:space:]' < .nvmrc)" ]; then
  echo "warning: Node $NODE_MAJOR is active but .nvmrc asks for $(cat .nvmrc); continuing." >&2
fi

echo "==> Creating env files from templates (existing files are kept)"
copy_if_missing() { [ -f "$2" ] || { cp "$1" "$2"; echo "    created $2"; }; }
copy_if_missing .env.example .env
copy_if_missing apps/web/.env.example apps/web/.env.local
copy_if_missing apps/mobile/.env.example apps/mobile/.env
if [ ! -f apps/api-py/.env ]; then
  cp apps/api-py/.env.example apps/api-py/.env
  # The templates ship sentinels for secrets; fill them with real random values for local use.
  python3 - <<'PY'
import pathlib, secrets
path = pathlib.Path("apps/api-py/.env")
text = path.read_text()
text = text.replace("<generate with: openssl rand -base64 48>", secrets.token_urlsafe(48))
text = text.replace("<generate with: openssl rand -hex 32>", secrets.token_hex(32))
path.write_text(text)
PY
  # Point the API at the Compose Postgres instead of the throwaway SQLite default.
  python3 - <<'PY'
import pathlib
path = pathlib.Path("apps/api-py/.env")
lines = path.read_text().splitlines()
url = "DATABASE_URL=postgresql+asyncpg://mixmatch:mixmatch_password@localhost:5432/mixmatch_dev"
path.write_text("\n".join(url if l.startswith("DATABASE_URL=") else l for l in lines) + "\n")
PY
  echo "    created apps/api-py/.env"
fi

echo "==> Installing JavaScript dependencies"
pnpm install --frozen-lockfile

echo "==> Installing the Python API into apps/api-py/.venv"
python3 -m venv apps/api-py/.venv
apps/api-py/.venv/bin/pip install --quiet --upgrade pip
apps/api-py/.venv/bin/pip install --quiet -e apps/api-py pytest pytest-asyncio

echo "==> Starting Postgres"
docker compose up -d --wait postgres

echo "==> Creating the database schema"
(
  cd apps/api-py
  .venv/bin/python - <<'PY'
import asyncio
import src.db.models  # noqa: F401  (registers the models)
from src.core.database import Base, engine

async def main():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    await engine.dispose()

asyncio.run(main())
PY
)

echo
echo "Setup complete. Start everything with: make dev"
echo "  API http://localhost:8000   Web http://localhost:3000"

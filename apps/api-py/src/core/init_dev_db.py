"""Create any missing tables for local development: ``python -m src.core.init_dev_db``.

Not a migration tool: it never alters existing tables. Production schemas must come from real
migrations, so this refuses to run when ``NODE_ENV=production``.
"""

import asyncio
import sys

from src.core.config import settings
from src.core.database import Base, engine
import src.db.models  # noqa: F401  (registers the models on Base.metadata)


async def init_dev_db() -> None:
    if settings.ENVIRONMENT == "production":
        raise SystemExit("init_dev_db is for development only; use migrations in production")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_dev_db())
    print("database schema is ready", file=sys.stderr)

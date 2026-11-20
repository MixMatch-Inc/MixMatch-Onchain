"""Run migrations without the alembic CLI: ``python -m src.db.migrate [upgrade|downgrade] [revision]``.

Usable inside the production image (which ships ``src`` but not ``alembic.ini``).
"""

import sys
from pathlib import Path

from alembic import command
from alembic.config import Config

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def build_config(url: str | None = None) -> Config:
    config = Config()
    config.set_main_option("script_location", str(MIGRATIONS_DIR))
    if url:
        config.set_main_option("sqlalchemy.url", url)
    return config


def main(argv: list[str]) -> None:
    action = argv[0] if argv else "upgrade"
    revision = argv[1] if len(argv) > 1 else ("head" if action == "upgrade" else "-1")
    getattr(command, action)(build_config(), revision)


if __name__ == "__main__":
    main(sys.argv[1:])

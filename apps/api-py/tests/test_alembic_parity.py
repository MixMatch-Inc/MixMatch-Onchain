"""The migrations must produce the schema the SQLAlchemy models describe (#1452)."""

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect

from src.core.database import Base
import src.db.models  # noqa: F401
from src.db.migrate import build_config


def sqlite_url(tmp_path) -> str:
    return f"sqlite:///{tmp_path / 'migrated.db'}"


def test_there_is_a_single_head():
    script = ScriptDirectory.from_config(build_config())
    assert len(script.get_heads()) == 1


def test_upgrade_head_matches_the_models(tmp_path):
    url = sqlite_url(tmp_path)
    command.upgrade(build_config(url), "head")

    engine = create_engine(url)
    with engine.connect() as connection:
        # Column types are not compared: SQLite reflects several of them loosely, which would only add noise.
        context = MigrationContext.configure(connection, opts={"compare_type": False})
        differences = compare_metadata(context, Base.metadata)
    engine.dispose()

    assert differences == [], f"models and migrations disagree (add a revision): {differences}"


def test_every_model_table_exists_after_upgrade(tmp_path):
    url = sqlite_url(tmp_path)
    command.upgrade(build_config(url), "head")

    engine = create_engine(url)
    tables = set(inspect(engine).get_table_names())
    engine.dispose()

    assert set(Base.metadata.tables) <= tables


def test_downgrade_to_base_removes_everything(tmp_path):
    url = sqlite_url(tmp_path)
    config = build_config(url)
    command.upgrade(config, "head")
    command.downgrade(config, "base")

    engine = create_engine(url)
    tables = set(inspect(engine).get_table_names()) - {"alembic_version"}
    engine.dispose()

    assert tables == set()

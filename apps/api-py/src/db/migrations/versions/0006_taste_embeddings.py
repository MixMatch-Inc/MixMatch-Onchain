"""Add taste embedding and top_tracks for pgvector-ready taste profiles.

Revision ID: 0006_taste_embeddings
Revises: 0003_handles_contacts, 0004_security_notifications, 0005_settings_social
Create Date: 2026-11-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_taste_embeddings"
down_revision: Union[str, Sequence[str], None] = (
    "0003_handles_contacts",
    "0004_security_notifications",
    "0005_settings_social",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    with op.batch_alter_table("taste_profiles") as batch_op:
        batch_op.add_column(sa.Column("top_tracks", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("embedding", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("source", sa.String(length=32), nullable=False, server_default="mock"))
        batch_op.create_index("ix_taste_profiles_user_id", ["user_id"])
    if bind.dialect.name == "postgresql":
        # Optional pgvector column for ANN search; JSON embedding remains portable source of truth.
        op.execute("ALTER TABLE taste_profiles ADD COLUMN IF NOT EXISTS embedding_vector vector(32)")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE taste_profiles DROP COLUMN IF EXISTS embedding_vector")
    with op.batch_alter_table("taste_profiles") as batch_op:
        batch_op.drop_index("ix_taste_profiles_user_id")
        batch_op.drop_column("source")
        batch_op.drop_column("embedding")
        batch_op.drop_column("top_tracks")

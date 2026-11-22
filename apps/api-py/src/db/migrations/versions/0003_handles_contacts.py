"""Handles, saved contacts and SEP-2 federation (#1387, #1388).

Revision ID: 0003_handles_contacts
Revises: 0002_blocks_reports, 0002_escrow_disputes
Create Date: 2026-11-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_handles_contacts"
down_revision: Union[str, tuple, None] = ("0002_blocks_reports", "0002_escrow_disputes")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("handle", sa.String(64), nullable=True))
    op.create_index("ix_users_handle", "users", ["handle"], unique=True)
    op.create_table(
        "contacts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("destination_public_key", sa.String(56), nullable=False),
        sa.Column("memo", sa.String(28), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_contacts_user_id", "contacts", ["user_id"])
    op.create_index("ix_contacts_user_label", "contacts", ["user_id", "label"])


def downgrade() -> None:
    op.drop_index("ix_contacts_user_label", table_name="contacts")
    op.drop_index("ix_contacts_user_id", table_name="contacts")
    op.drop_table("contacts")
    op.drop_index("ix_users_handle", table_name="users")
    op.drop_column("users", "handle")

"""Escrow disputes and evidence notes (#1400).

Revision ID: 0002_escrow_disputes
Revises: 0001_baseline
Create Date: 2026-11-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_escrow_disputes"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "escrow_disputes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("escrow_id", sa.String(36), sa.ForeignKey("escrows.id", ondelete="CASCADE"), nullable=False),
        sa.Column("opened_by", sa.String(36), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("resolution", sa.String(16), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("resolved_by", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("escrow_id"),
    )
    op.create_index("ix_escrow_disputes_status", "escrow_disputes", ["status"])
    op.create_table(
        "escrow_evidence",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("dispute_id", sa.String(36), sa.ForeignKey("escrow_disputes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.String(36), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_escrow_evidence_dispute_id", "escrow_evidence", ["dispute_id"])


def downgrade() -> None:
    op.drop_index("ix_escrow_evidence_dispute_id", table_name="escrow_evidence")
    op.drop_table("escrow_evidence")
    op.drop_index("ix_escrow_disputes_status", table_name="escrow_disputes")
    op.drop_table("escrow_disputes")

"""Add swipes, matches, messages, and listening party tables.

Revision ID: 0006_swipes_messages_parties
Revises: 0003_handles_contacts, 0004_security_notifications, 0005_settings_social
Create Date: 2026-11-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_swipes_messages_parties"
down_revision: Union[str, Sequence[str], None] = (
    "0003_handles_contacts",
    "0004_security_notifications",
    "0005_settings_social",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "swipes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("swiper_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("swiped_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("direction", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("swiper_id", "swiped_id", name="uq_swipes_pair"),
    )
    op.create_index("ix_swipes_swiper_id", "swipes", ["swiper_id"])
    op.create_index("ix_swipes_swiped_id", "swipes", ["swiped_id"])
    op.create_index("ix_swipes_swiper_created", "swipes", ["swiper_id", "created_at"])

    op.create_table(
        "matches",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_a_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_b_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_a_id", "user_b_id", name="uq_matches_pair"),
    )
    op.create_index("ix_matches_user_a_id", "matches", ["user_a_id"])
    op.create_index("ix_matches_user_b_id", "matches", ["user_b_id"])

    op.create_table(
        "messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("sender_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipient_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("delivery_state", sa.String(16), nullable=False, server_default="sent"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_messages_sender_id", "messages", ["sender_id"])
    op.create_index("ix_messages_recipient_id", "messages", ["recipient_id"])
    op.create_index("ix_messages_pair_created", "messages", ["sender_id", "recipient_id", "created_at"])

    op.create_table(
        "listening_parties",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("host_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_listening_parties_host_user_id", "listening_parties", ["host_user_id"])

    op.create_table(
        "listening_party_members",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("party_id", sa.String(36), sa.ForeignKey("listening_parties.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(16), nullable=False, server_default="guest"),
        sa.Column("presence", sa.String(16), nullable=False, server_default="online"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("party_id", "user_id", name="uq_party_member"),
    )
    op.create_index("ix_listening_party_members_party_id", "listening_party_members", ["party_id"])
    op.create_index("ix_listening_party_members_user_id", "listening_party_members", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_listening_party_members_user_id", table_name="listening_party_members")
    op.drop_index("ix_listening_party_members_party_id", table_name="listening_party_members")
    op.drop_table("listening_party_members")
    op.drop_index("ix_listening_parties_host_user_id", table_name="listening_parties")
    op.drop_table("listening_parties")
    op.drop_index("ix_messages_pair_created", table_name="messages")
    op.drop_index("ix_messages_recipient_id", table_name="messages")
    op.drop_index("ix_messages_sender_id", table_name="messages")
    op.drop_table("messages")
    op.drop_index("ix_matches_user_b_id", table_name="matches")
    op.drop_index("ix_matches_user_a_id", table_name="matches")
    op.drop_table("matches")
    op.drop_index("ix_swipes_swiper_created", table_name="swipes")
    op.drop_index("ix_swipes_swiped_id", table_name="swipes")
    op.drop_index("ix_swipes_swiper_id", table_name="swipes")
    op.drop_table("swipes")

"""Baseline schema, matching src/db/models.py.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-11-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

JSONType = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        *timestamps(),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "stellar_accounts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("public_key", sa.String(56), nullable=False),
        sa.Column("encrypted_secret_key", sa.Text(), nullable=True),
        sa.Column("signing_key_id", sa.String(255), nullable=True),
        sa.Column("network", sa.String(32), nullable=False),
        sa.Column("multisig_configured", sa.Boolean(), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_stellar_accounts_public_key", "stellar_accounts", ["public_key"], unique=True)

    op.create_table(
        "transactions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("idempotency_key", sa.String(255), nullable=False),
        sa.Column(
            "stellar_account_id", sa.String(36), sa.ForeignKey("stellar_accounts.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("destination_public_key", sa.String(56), nullable=False),
        sa.Column("amount", sa.String(64), nullable=False),
        sa.Column("memo", sa.String(28), nullable=True),
        sa.Column("asset_code", sa.String(12), nullable=True),
        sa.Column("asset_issuer", sa.String(56), nullable=True),
        sa.Column("receive_asset_code", sa.String(12), nullable=True),
        sa.Column("receive_asset_issuer", sa.String(56), nullable=True),
        sa.Column("dest_amount", sa.String(64), nullable=True),
        sa.Column("pending_envelope_xdr", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("stellar_tx_hash", sa.String(64), nullable=True),
        sa.Column("failure_code", sa.String(64), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False),
        sa.Column("last_reconciled_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_transactions_idempotency_key", "transactions", ["idempotency_key"], unique=True)
    op.create_index("ix_transactions_status", "transactions", ["status"])
    op.create_index("ix_transactions_stellar_tx_hash", "transactions", ["stellar_tx_hash"])
    op.create_index("ix_transactions_account_created", "transactions", ["stellar_account_id", "created_at"])

    op.create_table(
        "escrows",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("idempotency_key", sa.String(255), nullable=False),
        sa.Column(
            "payer_stellar_account_id",
            sa.String(36),
            sa.ForeignKey("stellar_accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("payee_public_key", sa.String(56), nullable=False),
        sa.Column("token_contract_id", sa.String(56), nullable=False),
        sa.Column("amount", sa.String(64), nullable=False),
        sa.Column("on_chain_escrow_id", sa.String(64), nullable=True),
        sa.Column("timeout_ledger", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("deposit_tx_hash", sa.String(64), nullable=True),
        sa.Column("finalize_tx_hash", sa.String(64), nullable=True),
        sa.Column("failure_code", sa.String(64), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_escrows_idempotency_key", "escrows", ["idempotency_key"], unique=True)

    op.create_table(
        "anchor_transactions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "stellar_account_id", sa.String(36), sa.ForeignKey("stellar_accounts.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("asset_code", sa.String(12), nullable=False),
        sa.Column("home_domain", sa.String(255), nullable=False),
        sa.Column("sep24_transaction_id", sa.String(255), nullable=False),
        sa.Column("status", sa.String(64), nullable=False),
        sa.Column("interactive_url", sa.Text(), nullable=True),
        sa.Column("more_info_url", sa.Text(), nullable=True),
        sa.Column("amount_in", sa.String(64), nullable=True),
        sa.Column("amount_out", sa.String(64), nullable=True),
        sa.Column("stellar_transaction_id", sa.String(64), nullable=True),
        sa.Column("external_transaction_id", sa.String(255), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
    )
    op.create_index(
        "ix_anchor_transactions_sep24_transaction_id", "anchor_transactions", ["sep24_transaction_id"], unique=True
    )

    op.create_table(
        "streaming_connections",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("provider_account_id", sa.String(255), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
    )

    op.create_table(
        "taste_profiles",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("top_artists", JSONType, nullable=True),
        sa.Column("top_genres", JSONType, nullable=True),
        sa.Column("acousticness", sa.Float(), nullable=True),
        sa.Column("danceability", sa.Float(), nullable=True),
        sa.Column("energy", sa.Float(), nullable=True),
        sa.Column("valence", sa.Float(), nullable=True),
        sa.Column("last_ingested_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("taste_profiles")
    op.drop_table("streaming_connections")
    op.drop_index("ix_anchor_transactions_sep24_transaction_id", table_name="anchor_transactions")
    op.drop_table("anchor_transactions")
    op.drop_index("ix_escrows_idempotency_key", table_name="escrows")
    op.drop_table("escrows")
    for name in (
        "ix_transactions_account_created",
        "ix_transactions_stellar_tx_hash",
        "ix_transactions_status",
        "ix_transactions_idempotency_key",
    ):
        op.drop_index(name, table_name="transactions")
    op.drop_table("transactions")
    op.drop_index("ix_stellar_accounts_public_key", table_name="stellar_accounts")
    op.drop_table("stellar_accounts")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

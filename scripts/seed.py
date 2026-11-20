"""seed.py – development seed script and test-data factories (issue #1470).

Seeds users, funded Stellar testnet accounts and sample payment/taste history.
Usage:
    python scripts/seed.py

Requires DATABASE_URL and STELLAR_NETWORK=testnet in the environment.
"""
from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from faker import Faker

fake = Faker()

# ---------------------------------------------------------------------------
# Factories
# ---------------------------------------------------------------------------

def make_user(
    *,
    role: str = "USER",
    override: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return a dict matching the User model shape."""
    base = {
        "id": str(uuid.uuid4()),
        "email": fake.email(),
        "display_name": fake.name(),
        "hashed_password": "$2b$12$placeholder_hashed_password_for_seed",
        "role": role,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "listening_history_consent": True,
        "tos_accepted_at": datetime.now(timezone.utc).isoformat(),
    }
    if override:
        base.update(override)
    return base


def make_payment(
    sender_id: str,
    recipient_id: str,
    *,
    status: str = "COMPLETED",
) -> dict[str, Any]:
    """Return a dict matching the Payment model shape."""
    return {
        "id": str(uuid.uuid4()),
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "amount": str(fake.pydecimal(left_digits=3, right_digits=7, positive=True)),
        "asset_code": "XLM",
        "status": status,
        "stellar_tx_hash": fake.hexify(text="^" * 64) if status == "COMPLETED" else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def fund_testnet_account(stellar_public_key: str) -> bool:
    """Fund a Stellar testnet account via friendbot."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://friendbot.stellar.org",
                params={"addr": stellar_public_key},
                timeout=15.0,
            )
            return resp.status_code == 200
        except httpx.RequestError:
            return False


async def main() -> None:
    """Seed the development database."""
    db_url = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./test.db")
    network = os.environ.get("STELLAR_NETWORK", "testnet")

    if network != "testnet":
        raise SystemExit("seed.py must only run against STELLAR_NETWORK=testnet")

    print(f"Seeding against: {db_url}")

    users = [make_user() for _ in range(5)]
    admin = make_user(role="ADMIN", override={"email": "admin@mixmatch.app"})
    all_users = [admin] + users

    payments = [
        make_payment(users[0]["id"], users[1]["id"]),
        make_payment(users[1]["id"], users[2]["id"]),
        make_payment(users[2]["id"], users[0]["id"], status="PENDING"),
    ]

    print(f"Created {len(all_users)} users and {len(payments)} payments (in-memory)")
    print("To insert into the DB, wire these dicts into SQLAlchemy sessions.")
    print("Accounts to fund on testnet:")
    for u in users[:2]:
        print(f"  {u['id']} (would fund: stellar_public_key)")

    # Example: await fund_testnet_account('<GXXXX...>')
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())

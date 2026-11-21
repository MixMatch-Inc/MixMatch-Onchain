"""Blocking, reporting and the admin review queue (#1408)."""
from datetime import datetime, timezone
from typing import Iterable, Optional

from sqlalchemy import Select, and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Block, Report, User

REPORT_REASONS = {"SPAM", "HARASSMENT", "INAPPROPRIATE", "IMPERSONATION", "SCAM", "OTHER"}
REPORT_STATUSES = {"OPEN", "ACTIONED", "DISMISSED"}


class ModerationError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


async def block_user(db: AsyncSession, blocker_id: str, blocked_id: str) -> Block:
    if blocker_id == blocked_id:
        raise ModerationError("You cannot block yourself")
    if await db.get(User, blocked_id) is None:
        raise ModerationError("User not found", 404)
    existing = (
        await db.execute(select(Block).where(Block.blocker_id == blocker_id, Block.blocked_id == blocked_id))
    ).scalar_one_or_none()
    if existing:
        return existing  # idempotent
    block = Block(blocker_id=blocker_id, blocked_id=blocked_id)
    db.add(block)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return (
            await db.execute(select(Block).where(Block.blocker_id == blocker_id, Block.blocked_id == blocked_id))
        ).scalar_one()
    return block


async def unblock_user(db: AsyncSession, blocker_id: str, blocked_id: str) -> bool:
    block = (
        await db.execute(select(Block).where(Block.blocker_id == blocker_id, Block.blocked_id == blocked_id))
    ).scalar_one_or_none()
    if block is None:
        return False
    await db.delete(block)
    await db.commit()
    return True


async def list_blocks(db: AsyncSession, blocker_id: str) -> list[Block]:
    result = await db.execute(select(Block).where(Block.blocker_id == blocker_id).order_by(Block.created_at.desc()))
    return list(result.scalars().all())


async def hidden_user_ids(db: AsyncSession, user_id: str) -> set[str]:
    """Everyone `user_id` must not see or be seen by: users they blocked and users who blocked them."""
    rows = await db.execute(
        select(Block.blocker_id, Block.blocked_id).where(or_(Block.blocker_id == user_id, Block.blocked_id == user_id))
    )
    hidden: set[str] = set()
    for blocker_id, blocked_id in rows.all():
        hidden.add(blocked_id if blocker_id == user_id else blocker_id)
    return hidden


def exclude_blocked(stmt: Select, user_column, viewer_id: str) -> Select:
    """Add a filter to a deck/chat query so rows whose `user_column` is blocked (either way) are dropped.

    Usage: `stmt = exclude_blocked(select(User), User.id, viewer_id)`.
    """
    blocked_by_viewer = select(Block.blocked_id).where(Block.blocker_id == viewer_id)
    blocked_viewer = select(Block.blocker_id).where(Block.blocked_id == viewer_id)
    return stmt.where(and_(user_column.not_in(blocked_by_viewer), user_column.not_in(blocked_viewer)))


async def can_interact(db: AsyncSession, user_a: str, user_b: str) -> bool:
    """False when either user has blocked the other. Check before delivering a chat message."""
    return user_b not in await hidden_user_ids(db, user_a)


async def create_report(
    db: AsyncSession, reporter_id: str, reported_id: str, reason: str, details: Optional[str]
) -> Report:
    if reporter_id == reported_id:
        raise ModerationError("You cannot report yourself")
    if reason not in REPORT_REASONS:
        raise ModerationError(f"reason must be one of {sorted(REPORT_REASONS)}")
    if await db.get(User, reported_id) is None:
        raise ModerationError("User not found", 404)
    report = Report(reporter_id=reporter_id, reported_id=reported_id, reason=reason, details=details, status="OPEN")
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


async def list_reports(db: AsyncSession, status: Optional[str] = "OPEN", limit: int = 100) -> list[Report]:
    stmt = select(Report).order_by(Report.created_at.asc()).limit(limit)
    if status:
        if status not in REPORT_STATUSES:
            raise ModerationError(f"status must be one of {sorted(REPORT_STATUSES)}")
        stmt = stmt.where(Report.status == status)
    return list((await db.execute(stmt)).scalars().all())


async def resolve_report(
    db: AsyncSession, report_id: str, admin_id: str, outcome: str, note: Optional[str], deactivate_user: bool = False
) -> Report:
    if outcome not in {"ACTIONED", "DISMISSED"}:
        raise ModerationError("outcome must be ACTIONED or DISMISSED")
    report = await db.get(Report, report_id)
    if report is None:
        raise ModerationError("Report not found", 404)
    if report.status != "OPEN":
        raise ModerationError("Report is already resolved", 409)
    report.status = outcome
    report.resolution_note = note
    report.resolved_by = admin_id
    report.resolved_at = datetime.now(timezone.utc)
    if outcome == "ACTIONED" and deactivate_user:
        reported = await db.get(User, report.reported_id)
        if reported is not None:
            reported.is_active = False
    await db.commit()
    await db.refresh(report)
    return report

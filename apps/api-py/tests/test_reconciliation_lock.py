"""Two instances must never reconcile concurrently, and the job reports its health (#1460, #1461)."""

import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.core.database import Base
from src.core.metrics import ReconciliationMetricsCollector, reconciliation_metrics
from src.db.models import StellarAccount, Transaction, User
from src.modules.payments.locks import LocalProcessLock, PostgresAdvisoryLock, lock_for
from src.modules.payments.reconciliation_job import ReconciliationJob


class SharedLockBackend:
    """Stands in for the database: one advisory lock shared by every 'instance' that uses it."""

    def __init__(self):
        self.holder = None

    def lock(self, name: str):
        backend = self

        class _Lock:
            async def acquire(self_inner) -> bool:
                if backend.holder is not None:
                    return False
                backend.holder = name
                return True

            async def release(self_inner) -> None:
                if backend.holder == name:
                    backend.holder = None

        return _Lock()


@pytest.fixture
async def session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    await engine.dispose()


@pytest.fixture(autouse=True)
def fresh_metrics():
    reconciliation_metrics.reset()
    yield
    reconciliation_metrics.reset()


async def test_two_instances_never_reconcile_concurrently(session_factory, monkeypatch):
    backend = SharedLockBackend()
    active = 0
    max_active = 0
    cycles = 0

    async def slow_reconcile(self):
        nonlocal active, max_active, cycles
        active += 1
        max_active = max(max_active, active)
        cycles += 1
        await asyncio.sleep(0.05)
        active -= 1
        return []

    monkeypatch.setattr("src.modules.payments.reconciliation_job.PaymentsService.reconcile_pending_transactions", slow_reconcile)

    jobs = [ReconciliationJob(session_factory=session_factory, lock=backend.lock(f"instance-{i}")) for i in range(4)]
    results = await asyncio.gather(*(job.run_once() for job in jobs))

    assert max_active == 1
    assert cycles == 1  # the others skipped while the first held the lock
    assert results.count(0) == 4  # nothing to reconcile, nobody crashed
    assert backend.holder is None  # released afterwards


async def test_lock_is_released_even_when_reconciliation_fails(session_factory, monkeypatch):
    backend = SharedLockBackend()

    async def broken(self):
        raise RuntimeError("horizon exploded")

    monkeypatch.setattr("src.modules.payments.reconciliation_job.PaymentsService.reconcile_pending_transactions", broken)

    job = ReconciliationJob(session_factory=session_factory, lock=backend.lock("a"))
    with pytest.raises(RuntimeError):
        await job.run_once()
    assert backend.holder is None
    assert await backend.lock("b").acquire()


async def test_local_lock_is_exclusive_and_reusable():
    first, second = LocalProcessLock(), LocalProcessLock()
    assert await first.acquire()
    assert not await second.acquire()
    await first.release()
    assert await second.acquire()
    await second.release()


def test_lock_selection_follows_the_database_dialect():
    class FakeEngine:
        def __init__(self, name):
            self.dialect = type("D", (), {"name": name})()

    assert isinstance(lock_for(FakeEngine("postgresql")), PostgresAdvisoryLock)
    assert isinstance(lock_for(FakeEngine("sqlite")), LocalProcessLock)


async def test_postgres_lock_issues_try_lock_and_unlock():
    executed = []

    class FakeResult:
        def __init__(self, value):
            self._value = value

        def scalar(self):
            return self._value

    class FakeConnection:
        closed = False

        async def execute(self, statement, params):
            executed.append((str(statement), params))
            return FakeResult(True)

        async def close(self):
            self.closed = True

    class FakeEngine:
        async def connect(self):
            return FakeConnection()

    lock = PostgresAdvisoryLock(FakeEngine(), key=42)
    assert await lock.acquire()
    assert not await lock.acquire()  # already held by this holder
    await lock.release()

    assert "pg_try_advisory_lock" in executed[0][0] and executed[0][1] == {"key": 42}
    assert "pg_advisory_unlock" in executed[1][0]


async def test_postgres_lock_reports_contention_and_closes_its_connection():
    class FakeResult:
        def scalar(self):
            return False

    class FakeConnection:
        closed = False

        async def execute(self, statement, params):
            return FakeResult()

        async def close(self):
            self.closed = True

    connection = FakeConnection()

    class FakeEngine:
        async def connect(self):
            return connection

    assert not await PostgresAdvisoryLock(FakeEngine()).acquire()
    assert connection.closed


@pytest.mark.skipif(not os.environ.get("TEST_POSTGRES_URL"), reason="needs a real PostgreSQL (set TEST_POSTGRES_URL)")
async def test_real_postgres_advisory_lock_excludes_a_second_engine():
    url = os.environ["TEST_POSTGRES_URL"]
    first_engine, second_engine = create_async_engine(url), create_async_engine(url)
    try:
        first, second = PostgresAdvisoryLock(first_engine), PostgresAdvisoryLock(second_engine)
        assert await first.acquire()
        assert not await second.acquire()
        await first.release()
        assert await second.acquire()
        await second.release()
    finally:
        await first_engine.dispose()
        await second_engine.dispose()


# ── #1460: backlog, oldest pending age and heartbeat ─────────────────────────


async def seed_pending(session_factory, age_minutes: float, status: str = "PENDING"):
    async with session_factory() as session:
        user = User(id=str(uuid.uuid4()), email=f"{uuid.uuid4()}@example.com")
        account = StellarAccount(id=str(uuid.uuid4()), user_id=user.id, public_key="G" + "A" * 55)
        session.add_all([user, account])
        await session.flush()
        created = datetime.now(timezone.utc) - timedelta(minutes=age_minutes)
        session.add(
            Transaction(
                id=str(uuid.uuid4()),
                idempotency_key=str(uuid.uuid4()),
                stellar_account_id=account.id,
                destination_public_key="G" + "B" * 55,
                amount="1.0",
                status=status,
                created_at=created,
                updated_at=created,
                last_reconciled_at=datetime.now(timezone.utc),  # recently reconciled: left alone by this cycle
            )
        )
        await session.commit()


async def test_a_cycle_reports_backlog_and_oldest_pending_age(session_factory):
    await seed_pending(session_factory, age_minutes=12)
    await seed_pending(session_factory, age_minutes=3)
    await seed_pending(session_factory, age_minutes=60, status="SUCCESS")

    job = ReconciliationJob(session_factory=session_factory, lock=SharedLockBackend().lock("a"))
    await job.run_once()

    snapshot = reconciliation_metrics.snapshot()
    assert snapshot["backlog"] == 2
    assert 11 * 60 < snapshot["oldest_pending_age_seconds"] < 13 * 60
    assert snapshot["last_run_at"] is not None
    assert snapshot["last_tick_at"] is not None


async def test_an_empty_queue_reports_zero_backlog(session_factory):
    job = ReconciliationJob(session_factory=session_factory, lock=SharedLockBackend().lock("a"))
    await job.run_once()
    assert reconciliation_metrics.backlog == 0
    assert reconciliation_metrics.oldest_pending_age_seconds is None


async def test_the_heartbeat_moves_even_when_another_instance_holds_the_lock(session_factory):
    backend = SharedLockBackend()
    assert await backend.lock("other").acquire()
    job = ReconciliationJob(session_factory=session_factory, lock=backend.lock("me"))

    await job.run_once()

    assert reconciliation_metrics.last_tick_at is not None
    assert reconciliation_metrics.last_run_at is None  # it skipped, so no cycle completed here


def test_a_stalled_loop_is_detected():
    collector = ReconciliationMetricsCollector()
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)

    assert collector.is_stalled(60, now)  # never ticked
    collector.record_tick(now)
    assert not collector.is_stalled(60, now + timedelta(seconds=30))
    assert collector.is_stalled(60, now + timedelta(seconds=61))

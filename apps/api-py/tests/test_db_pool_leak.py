import asyncio
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.core.database import Base, get_db

@pytest.mark.asyncio
async def test_async_db_session_concurrency_no_leak():
    """Issue #1166: Assert concurrent async sessions release connections cleanly without leaks."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def worker(worker_id: int):
        async with session_factory() as session:
            # Execute quick probe
            res = await session.execute(text("SELECT 1"))
            val = res.scalar()
            assert val == 1
        return worker_id

    # Run 50 concurrent session queries
    tasks = [worker(i) for i in range(50)]
    results = await asyncio.gather(*tasks)
    assert len(results) == 50
    assert sorted(results) == list(range(50))

    await engine.dispose()

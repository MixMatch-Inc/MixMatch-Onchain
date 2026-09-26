import pytest
from unittest.mock import AsyncMock, patch
from src.core.config import settings
from src.modules.taste.service import TasteService
from src.modules.taste.taste_cron import TasteCronScheduler

@pytest.mark.asyncio
async def test_taste_service_stub_profile():
    """Issue #1157: Test taste profile computation returns expected audio attributes."""
    svc = TasteService()
    profile = await svc.compute_user_taste_profile("user-track-listener-42")
    assert profile["user_id"] == "user-track-listener-42"
    assert "indie-rock" in profile["top_genres"]
    assert profile["danceability"] > 0.0
    assert profile["energy"] > 0.0
    assert profile["is_mock"] is True

@pytest.mark.asyncio
async def test_taste_scheduler_registration_and_callback():
    """Issue #1157: Test scheduler registration gating and exception isolation."""
    # When disabled
    with patch.object(settings, "ENABLE_TASTE_CRON", False):
        scheduler = TasteCronScheduler()
        assert scheduler.start() is False
        assert scheduler.is_running is False

    # When enabled
    with patch.object(settings, "ENABLE_TASTE_CRON", True):
        scheduler = TasteCronScheduler()
        assert scheduler.start() is True
        assert scheduler.is_running is True
        scheduler.stop()
        assert scheduler.is_running is False

    # Graceful error handling in callback
    mock_svc = AsyncMock()
    mock_svc.execute_nightly_computation_batch.side_effect = Exception("Out of memory on taste clustering")
    resilient_scheduler = TasteCronScheduler(service=mock_svc)
    result = await resilient_scheduler.run_job_callback()
    assert result is False  # Trapped without raising unhandled exception

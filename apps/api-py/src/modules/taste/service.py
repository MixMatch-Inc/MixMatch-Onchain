import logging
from typing import Dict, Any, List

logger = logging.getLogger("taste.service")

class TasteService:
    """Taste profile service stub ported from taste.service.ts with explicit mock indicators."""

    def __init__(self):
        pass

    async def compute_user_taste_profile(self, user_id: str) -> Dict[str, Any]:
        # Current implementation is mock/stub pending ML recommendation pipeline
        return {
            "user_id": user_id,
            "top_genres": ["indie-rock", "synthwave", "electronic"],
            "acousticness": 0.42,
            "danceability": 0.78,
            "energy": 0.85,
            "valence": 0.65,
            "is_mock": True
        }

    async def execute_nightly_computation_batch(self) -> int:
        """Batch computation called by cron scheduler."""
        logger.info("Executing nightly taste profile computation batch (stub)")
        return 0

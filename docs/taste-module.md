# Taste Module Documentation

## Purpose
The `taste` module in MixMatch provides music taste profile analysis and social matching metrics.

## Status in Ported FastAPI Service
- **HTTP Surface**:
  - `GET /api/taste/health`: Reports health status, stub status, and whether cron is enabled.
  - `GET /api/taste/profile/{user_id}`: Returns computed music taste profile parameters (genres, acousticness, danceability, energy, valence).
- **Background Cron**:
  - Controlled by `ENABLE_TASTE_CRON` in `src/core/config.py`.
  - Disabled by default to prevent misleading mock runs.
  - Handled by `TasteCronScheduler` with full exception trapping around service calls.

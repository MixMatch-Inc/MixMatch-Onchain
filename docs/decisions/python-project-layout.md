# Architectural Decision Record: Python Project Layout and Tooling

## Status
**Decided**

## Context
The MixMatch backend is being migrated from a NestJS monorepo to a FastAPI service. The new service (`apps/api-py`) needs a project layout and tooling story that (a) keeps it side-by-side with the legacy `apps/api` while the cutover proceeds, and (b) gives the repo a single, repeatable way to build, test, and run the service — replacing the ad-hoc per-feature porting scaffolds that preceded it.

Two competing packaging managers were considered: `uv` (fast, modern, single-tool) and `poetry` (mature, lockfile-first). The existing scaffold had accumulated inline `setuptools` metadata.

## Decision
1. **Layout**: the FastAPI service lives at `apps/api-py` with a **src-layout** — application code under `apps/api-py/src/`, tests under `apps/api-py/tests/`, packaging metadata at the project root `pyproject.toml`. Imports use the top-level `src.*` namespace.
2. **Tooling**: dependency and build metadata live in a standard `pyproject.toml` using the `setuptools >= 61` build backend (`requires-python = ">=3.11"`, dependencies pinned to safe lower bounds as of porting). No `requirements.txt` duplicate is maintained.
3. **Manager decision**: adopt `uv` as the standard local tool for creating the venv (`uv venv`), syncing deps (`uv sync`), and running the service/tests. The target Python is 3.12 while `requires-python` stays `>=3.11` for environment flexibility.
4. **Run conventions**: `uv run uvicorn src.main:app --port 8000` in `apps/api-py`; tests via `uv run pytest`.
5. Until the cutover is complete, `apps/api-py` and `apps/api` both remain in the repo; no path or module names overlap.

## Consequences
- A single, standard entry point for building and testing the Python service; no competing packaging conventions.
- Existing pip-based CI (`fastapi-ci.yml`, `pip install`) continues to work because metadata remains PEP 621/setuptools-compatible; `uv` can read the same `pyproject.toml` without a migration of package metadata.
- Post-cutover, `apps/api` can be removed with no layout change to the Python service.
- Any future dependency addition is declared once in `pyproject.toml` (no drift between requirements files).
#!/usr/bin/env bash
# Regenerates the pinned dependency files from pyproject.toml (needs uv: https://docs.astral.sh/uv/).
#   requirements.lock      runtime dependencies (used by the Docker image)
#   requirements-dev.lock  runtime + dev extra (used by CI)
# Commit both after changing dependencies in pyproject.toml.
set -euo pipefail
cd "$(dirname "$0")/.."
uv pip compile pyproject.toml --python-version 3.11 --generate-hashes -o requirements.lock
uv pip compile pyproject.toml --python-version 3.11 --generate-hashes --extra dev -o requirements-dev.lock

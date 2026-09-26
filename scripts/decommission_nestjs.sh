#!/bin/bash
set -euo pipefail

# MixMatch NestJS Decommissioning Script
# Port #1173: Safely archives legacy apps/api after successful 7-day cutover observation

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEGACY_DIR="$REPO_ROOT/apps/api"
ARCHIVE_DIR="$REPO_ROOT/archive/apps-api-nestjs"

echo "=== MixMatch NestJS API Decommissioning ==="

if [ ! -d "$LEGACY_DIR" ]; then
    echo "Legacy apps/api directory not found or already decommissioned."
    exit 0
fi

echo "1. Archiving apps/api to $ARCHIVE_DIR..."
mkdir -p "$(dirname "$ARCHIVE_DIR")"
cp -r "$LEGACY_DIR" "$ARCHIVE_DIR"

echo "2. Removing active apps/api from monorepo..."
rm -rf "$LEGACY_DIR"

echo "3. NestJS decommissioning complete. Git history is fully preserved."

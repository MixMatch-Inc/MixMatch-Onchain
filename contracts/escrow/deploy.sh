#!/usr/bin/env bash
# Builds and deploys the escrow contract to Stellar testnet, printing the
# deployed contract id (set STELLAR_ESCROW_CONTRACT_ID to this value in
# apps/api's environment).
#
# Requires the `stellar` CLI (cargo install --locked stellar-cli) and a
# funded source identity. Usage:
#   ./deploy.sh [source-identity]   # defaults to "escrow-deployer"
#
# If the identity doesn't exist yet, create + fund one first:
#   stellar keys generate escrow-deployer --network testnet --fund

set -euo pipefail

SOURCE="${1:-escrow-deployer}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Building mixmatch-escrow (release, wasm32v1-none)..." >&2
stellar contract build --package mixmatch-escrow --manifest-path "$REPO_ROOT/Cargo.toml"

WASM_PATH="$REPO_ROOT/target/wasm32v1-none/release/mixmatch_escrow.wasm"

echo "Deploying to testnet as '$SOURCE'..." >&2
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source "$SOURCE" \
  --network testnet \
  --)

echo "$CONTRACT_ID"

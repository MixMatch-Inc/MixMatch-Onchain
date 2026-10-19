#!/usr/bin/env bash
# Builds, optimizes and deploys the escrow contract, smoke-tests it, and records
# the result in contracts/escrow/deployments/<network>.json.
#
# Requires the `stellar` CLI (cargo install --locked stellar-cli) and a funded
# source identity. Usage:
#   ./deploy.sh [-n testnet|futurenet|mainnet] [-s source-identity] [-y] [-- constructor args...]
#
#   -n  network (default: $NETWORK or "testnet")
#   -s  source identity (default: $SOURCE or "escrow-deployer")
#   -y  confirm a mainnet deploy without the interactive prompt
#
# If the identity doesn't exist yet, create + fund one first:
#   stellar keys generate escrow-deployer --network testnet --fund

set -euo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:-escrow-deployer}"
CONFIRM_MAINNET=""

while getopts "n:s:y" opt; do
  case "$opt" in
    n) NETWORK="$OPTARG" ;;
    s) SOURCE="$OPTARG" ;;
    y) CONFIRM_MAINNET="yes" ;;
    *) echo "usage: $0 [-n network] [-s source] [-y] [-- constructor args...]" >&2; exit 2 ;;
  esac
done
shift $((OPTIND - 1))
[ "${1:-}" = "--" ] && shift
CTOR_ARGS=("$@")

case "$NETWORK" in
  testnet | futurenet | mainnet) ;;
  *) echo "error: unsupported network '$NETWORK' (use testnet, futurenet or mainnet)" >&2; exit 2 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# --- Preflight ---------------------------------------------------------------
command -v stellar >/dev/null || { echo "error: stellar CLI not found (cargo install --locked stellar-cli)" >&2; exit 1; }
echo "stellar CLI: $(stellar --version | head -n1)" >&2
SOURCE_ADDRESS="$(stellar keys address "$SOURCE" 2>/dev/null)" || {
  echo "error: identity '$SOURCE' not found (stellar keys generate $SOURCE --network $NETWORK --fund)" >&2
  exit 1
}
if command -v rustup >/dev/null && ! rustup target list --installed | grep -qx 'wasm32v1-none'; then
  echo "error: missing wasm32v1-none target (rustup target add wasm32v1-none)" >&2
  exit 1
fi

# --- Mainnet guard -----------------------------------------------------------
if [ "$NETWORK" = "mainnet" ] && [ "$CONFIRM_MAINNET" != "yes" ]; then
  echo "You are about to deploy to MAINNET as $SOURCE_ADDRESS." >&2
  read -r -p "Type 'mainnet' to continue: " answer
  [ "$answer" = "mainnet" ] || { echo "aborted" >&2; exit 1; }
fi

# --- Build and optimize ------------------------------------------------------
echo "Building mixmatch-escrow (release, wasm32v1-none)..." >&2
stellar contract build --package mixmatch-escrow --manifest-path "$REPO_ROOT/Cargo.toml"
WASM_PATH="$REPO_ROOT/target/wasm32v1-none/release/mixmatch_escrow.wasm"

echo "Optimizing wasm..." >&2
stellar contract optimize --wasm "$WASM_PATH"
OPTIMIZED_PATH="${WASM_PATH%.wasm}.optimized.wasm"

WASM_SIZE="$(wc -c <"$OPTIMIZED_PATH" | tr -d ' ')"
if command -v sha256sum >/dev/null; then
  WASM_SHA="$(sha256sum "$OPTIMIZED_PATH" | cut -d' ' -f1)"
else
  WASM_SHA="$(shasum -a 256 "$OPTIMIZED_PATH" | cut -d' ' -f1)"
fi
echo "wasm: $OPTIMIZED_PATH ($WASM_SIZE bytes, sha256 $WASM_SHA)" >&2

# --- Deploy ------------------------------------------------------------------
echo "Deploying to $NETWORK as '$SOURCE'..." >&2
CONTRACT_ID="$(stellar contract deploy \
  --wasm "$OPTIMIZED_PATH" \
  --source "$SOURCE" \
  --network "$NETWORK" \
  -- ${CTOR_ARGS[@]+"${CTOR_ARGS[@]}"})"

# --- Smoke test --------------------------------------------------------------
# A fresh contract has no escrows, so reading id 0 must fail with the contract's
# own NotFound error (#1) — proof the deployed wasm answers calls.
echo "Smoke testing $CONTRACT_ID..." >&2
SMOKE_OUTPUT="$(stellar contract invoke --id "$CONTRACT_ID" --source "$SOURCE" --network "$NETWORK" \
  -- get_escrow --escrow_id 0 2>&1 || true)"
if ! grep -q 'Error(Contract, #1)' <<<"$SMOKE_OUTPUT"; then
  echo "error: smoke test failed; unexpected response from $CONTRACT_ID:" >&2
  echo "$SMOKE_OUTPUT" >&2
  exit 1
fi
echo "smoke test passed" >&2

# --- Record ------------------------------------------------------------------
mkdir -p "$SCRIPT_DIR/deployments"
cat >"$SCRIPT_DIR/deployments/$NETWORK.json" <<JSON
{
  "network": "$NETWORK",
  "contract_id": "$CONTRACT_ID",
  "wasm_sha256": "$WASM_SHA",
  "wasm_size_bytes": $WASM_SIZE,
  "deployed_by": "$SOURCE_ADDRESS",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
echo "recorded deployments/$NETWORK.json" >&2

echo "$CONTRACT_ID"

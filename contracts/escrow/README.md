# mixmatch-escrow

A Soroban smart contract that locks a token payment in escrow between a
payer and payee, releasable by the payer's authorization or refundable
after a timeout. Backs `apps/api`'s `/escrows` endpoints (see
`apps/api/src/modules/payments/escrow.*`) for payouts where a payment
needs to be conditionally released rather than sent directly — e.g. once a
listening session or match completes.

This is deliberately scoped to a simple, explicit release condition: the
payer authorizes `release`. Oracle-based or multi-party release conditions
are a future issue, not this one.

## Contract interface

- `deposit(payer, payee, token, amount, timeout_ledgers) -> u64` — locks
  `amount` of `token` (any SEP-41 token contract, including the native
  XLM Stellar Asset Contract), transferred from `payer` into the contract.
  Requires `payer`'s authorization. Returns the new escrow's id.
  `timeout_ledgers` is how many ledgers from now the escrow stays
  payer-controlled before anyone can trigger a refund.
- `release(escrow_id)` — pays the escrow out to its payee. Requires the
  escrow's payer to authorize.
- `refund(escrow_id)` — returns the escrow's funds to its payer. Before
  the escrow's timeout ledger, this requires the payer's authorization
  (an explicit cancellation); from the timeout ledger onward, anyone may
  call it without authorization, so funds are never stuck if the payer
  goes silent.
- `get_escrow(escrow_id) -> Escrow` — read-only lookup of an escrow's
  current state (`payer`, `payee`, `token`, `amount`, `status`,
  `timeout_ledger`).

`Escrow.status` is one of `Locked`, `Released`, `Refunded` — a terminal
status (`Released`/`Refunded`) never transitions again; `deposit` always
allocates a fresh id rather than reusing one.

## Building

Requires the `stellar` CLI (`cargo install --locked stellar-cli`) and the
`wasm32v1-none` Rust target (`rustup target add wasm32v1-none` — **not**
`wasm32-unknown-unknown`, which Soroban's SDK explicitly rejects on
Rust 1.82+; see `build.rs`'s panic message if you hit this).

```bash
stellar contract build --package mixmatch-escrow
# -> target/wasm32v1-none/release/mixmatch_escrow.wasm
```

## Testing

Contract-level tests (Rust, using Soroban's own test harness with a
simulated ledger — `soroban_sdk::testutils`) live in `src/test.rs`:

```bash
cargo test -p mixmatch-escrow
```

These cover: locking funds on deposit, releasing to the payee, refunding
to the payer (both the explicit pre-timeout and unauthenticated
post-timeout paths), rejecting a non-positive deposit amount, and
rejecting a second `release`/`refund` on an already-finalized escrow.

## Deploying to testnet

```bash
# One-time: create and fund a deployer identity.
stellar keys generate escrow-deployer --network testnet --fund

# Build + deploy; prints the deployed contract id.
./deploy.sh escrow-deployer
```

Set the printed contract id as `STELLAR_ESCROW_CONTRACT_ID` in `apps/api`'s
environment (see `.env.example`) — that's what `packages/stellar`'s
`loadStellarConfig()` and the `/escrows` endpoints use.

### Manual verification against a deployed contract

To confirm a deployment actually works end-to-end (not just that the API
returns 200s), invoke it directly and read back on-chain state. Example
using native XLM's Stellar Asset Contract as the token:

```bash
CONTRACT=<deployed contract id>
TOKEN=$(stellar contract id asset --asset native --network testnet)
PAYER=$(stellar keys address escrow-deployer)
PAYEE=$(stellar keys address escrow-payee)  # another funded identity

stellar contract invoke --id "$CONTRACT" --source escrow-deployer --network testnet -- \
  deposit --payer "$PAYER" --payee "$PAYEE" --token "$TOKEN" --amount 5000000 --timeout_ledgers 5

stellar contract invoke --id "$CONTRACT" --source escrow-deployer --network testnet -- \
  get_escrow --escrow_id 0   # status: "Locked"

stellar contract invoke --id "$CONTRACT" --source escrow-deployer --network testnet -- \
  release --escrow_id 0      # emits a `transfer` event to $PAYEE
```

This was run against the current deployment (contract id
`CDH4VEBIXFRJ7C7WQYCMLRPDPDBD5KINZUXKRQVOHIR6OO5RGF7U4JS4` on testnet) for
both the release and refund paths, confirming real balance changes via
Horizon — not just successful API responses.

## Persistence model (apps/api)

Unlike `transactions` (where the durable-idempotency row can be created
with everything the client sent, before submission), an escrow's on-chain
id is only known *after* `deposit` lands. `escrows` rows therefore start
`PENDING` (created before submission, keyed by the same idempotency
pattern as `transactions`), then move to `LOCKED` once `deposit` succeeds
and the on-chain id/timeout are known, or `FAILED` if it doesn't. See
`apps/api/src/modules/payments/escrow.service.ts`.

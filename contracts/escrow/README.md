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
`wasm32-unknown-unknown`, which Soroban's SDK rejects on Rust 1.82+).

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

Each run also writes JSON ledger snapshots to `contracts/escrow/test_snapshots/`.

These cover: locking funds on deposit, releasing to the payee, refunding
to the payer (both the explicit pre-timeout and unauthenticated
post-timeout paths), rejecting a non-positive deposit amount, and
rejecting a second `release`/`refund` on an already-finalized escrow.

## Deploying

```bash
# One-time: create and fund a deployer identity.
stellar keys generate escrow-deployer --network testnet --fund

# Build, optimize, deploy and smoke-test; prints the deployed contract id.
./deploy.sh -s escrow-deployer              # testnet (default)
./deploy.sh -n futurenet -s escrow-deployer
./deploy.sh -n mainnet -s escrow-deployer   # asks you to type "mainnet" (or pass -y)
```

The script checks the `stellar` CLI, the identity and the `wasm32v1-none`
target first, reports the optimized wasm's size and SHA-256, and writes
`contracts/escrow/deployments/<network>.json` with the contract id and hash.
Constructor arguments, if the contract ever takes any, go after `--`.

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

Run it against your own deployment to confirm both the release and refund
paths and read the balance changes back from Horizon.

## Deployments

Record every deployment here. The hash is the SHA-256 of the deployed wasm
(`sha256sum` of the built wasm; see "Verifying a deployment").

| Network | Contract id | Date | Wasm SHA-256 |
| --- | --- | --- | --- |
| testnet | `CDH4VEBIXFRJ7C7WQYCMLRPDPDBD5KINZUXKRQVOHIR6OO5RGF7U4JS4` | not recorded | not recorded (deployed before CI-built artefacts) |

## Verifying a deployment

Every push that touches the contract builds the wasm in CI (workflow
`escrow-wasm.yml`) and uploads `mixmatch_escrow.wasm` with its
`mixmatch_escrow.wasm.sha256`; tagged releases (`escrow-v*`) attach both to
the GitHub release. To check a deployed contract:

```bash
stellar contract fetch --id "$CONTRACT" --network testnet --out-file deployed.wasm
sha256sum deployed.wasm        # must equal the CI artefact's .sha256
```

## Errors

Contract errors surface as `Error(Contract, #N)`.

| Code | Name | Raised when |
| --- | --- | --- |
| 1 | `NotFound` | `release`, `refund` or `get_escrow` is given an id that was never created |
| 2 | `AlreadyFinalized` | `release` or `refund` is called on an escrow that is already `Released` or `Refunded` |
| 3 | `InvalidAmount` | `deposit` is called with `amount <= 0` |

## Events

The contract publishes no events of its own. Observe an escrow through the
token contract: `deposit` emits a `transfer` event from the payer to the
contract, `release` a `transfer` to the payee, and `refund` a `transfer`
back to the payer. Use `get_escrow` for the current status.

## Ledger timing

`timeout_ledgers` counts ledgers, not seconds. Stellar closes a ledger about
every 5 seconds, so:

| Timeout | Approx. `timeout_ledgers` |
| --- | --- |
| 1 minute | 12 |
| 1 hour | 720 |
| 1 day | 17,280 |
| 7 days | 120,960 |

The deadline is `ledger sequence at deposit + timeout_ledgers`, stored as
`timeout_ledger`. Close times vary, so treat these as estimates.

## Storage and TTL

Escrows live in persistent storage and the id counter in instance storage.
The contract does not extend either entry's TTL, so an entry that is not
touched or bumped before its TTL runs out is archived and must be restored
before use. Operators should extend long-lived escrows with
`stellar contract extend`; any invocation that writes an escrow also refreshes it.

## `get_escrow` return shape

```text
Escrow {
  payer: Address,
  payee: Address,
  token: Address,
  amount: i128,          // in the token's smallest unit (stroops for XLM)
  status: Locked | Released | Refunded,
  timeout_ledger: u32,   // ledger sequence from which refund needs no auth
}
```

## Security and trust model

- Only the payer can `release`. The payee has no say, and no guarantee that
  the payer will ever release; after the timeout anyone can refund the payer.
- `token` is any contract address the payer supplies. A token with unusual
  behavior (fees on transfer, pausing, clawback) is trusted to behave like
  SEP-41; the contract records `amount` as requested.
- `deposit` computes `ledger sequence + timeout_ledgers` with overflow checks
  enabled, so a very large `timeout_ledgers` panics instead of wrapping.
- The contract has no admin, pause or upgrade entry point.

## Trust and custody model

While an escrow is `Locked`, the funds sit in the contract itself — neither
party can take them at will — but practical control follows the payer, not
the payee.

- **The payer controls the funds until release.** Only the payer can
  authorize `release`, and the payer may `refund` to themselves at any time
  before `timeout_ledger`. Until a `release` transaction is observed on
  chain, the payee has received nothing and has no on-chain way to force
  payment, dispute an outcome, or prove that release will ever happen.
- **After the timeout, control passes to everyone.** From `timeout_ledger`
  onward `refund` requires no authorization, so neither party can hold the
  other to the escrow forever — but the payee still cannot claim; the funds
  simply return to the payer.
- **What the payee can rely on** is limited to the locked amount remaining
  in the contract while the escrow is `Locked` and the payer being unable
  to withdraw it before the timeout without publicly cancelling. Anything
  stronger — delivery confirmation, dispute resolution, forced release —
  must come from an off-chain agreement between the parties.

A payee needing assurance should treat the escrow as payer-held custody
until it observes the `release` on chain, and size its exposure accordingly.

## Persistence model (apps/api)

Unlike `transactions` (where the durable-idempotency row can be created
with everything the client sent, before submission), an escrow's on-chain
id is only known *after* `deposit` lands. `escrows` rows therefore start
`PENDING` (created before submission, keyed by the same idempotency
pattern as `transactions`), then move to `LOCKED` once `deposit` succeeds
and the on-chain id/timeout are known, or `FAILED` if it doesn't. See
`apps/api/src/modules/payments/escrow.service.ts`.

# Payments module

Exposes Stellar native-XLM payments through the API and persists transaction
records, built on top of `@mixmatch/stellar`'s `StellarPaymentService`.

## Endpoints

All routes require `Authorization: Bearer <accessToken>` (`requireAuth`).

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/payments/send` | Sends a native XLM payment on the caller's behalf. |
| `GET` | `/api/payments/:id/status` | Returns a transaction's current status; transparently reconciles it first if it's been stuck `PENDING` past the reconciliation window. |
| `GET` | `/api/payments/history` | Paginated list of the caller's own transactions (`page`, `limit` query params). |
| `POST` | `/api/payments/:id/reconcile` | Manually triggers reconciliation for one owned transaction. |

## Account provisioning

Each user gets exactly one `StellarAccount`, created lazily on their first
`send`. On `testnet`, it's funded automatically via Friendbot; on `public`,
there is no auto-funding — an unfunded account will fail with
`SOURCE_ACCOUNT_NOT_FOUND` until it's funded some other way.

## Wallet custody

Secret keys are encrypted at rest with AES-256-GCM (`wallet-encryption.ts`,
keyed by `WALLET_ENCRYPTION_KEY`) and decrypted only in-memory, for the
duration of a single payment submission, via `@mixmatch/stellar`'s
`KeypairWallet`. See `@mixmatch/stellar`'s README for the broader custody
model this builds on.

## Idempotency

`sendPayment` accepts an optional `idempotencyKey`. A `Transaction` row is
created — with a unique DB constraint on `idempotencyKey` — *before*
submitting to Stellar. If a row for that key already exists (including
across process restarts, unlike `StellarPaymentService`'s own in-memory
dedup), that row's current state is returned instead of submitting a second
payment. If the caller omits a key, one is generated server-side, so repeat
calls without an explicit key are **not** deduplicated — pass a stable key
(e.g. derived from your own order/checkout ID) whenever a request might be
retried.

## Reconciliation

A payment could be accepted by Stellar but never recorded locally (e.g. a
process crash between Horizon's response and our DB write), leaving a
`Transaction` stuck at `PENDING` forever. Reconciliation recovers from this:

- `PaymentsService.reconcileTransaction` looks up the source account's
  recent Horizon payment history and matches by destination + amount +
  time to recover the true outcome.
- A match found → marked `SUCCESS` with the discovered tx hash.
- No match found, and the transaction is older than the reconciliation
  window (2 minutes) → marked `FAILED` with `reconciliation_timeout`.
- No match found, but still within the window → left `PENDING` (may still
  complete).

This runs automatically when `GET /:id/status` is called on a stale
`PENDING` transaction, or on-demand via `POST /:id/reconcile`.
`PaymentsService.reconcilePendingTransactions()` batch-reconciles every
stale `PENDING` transaction across all accounts — **not yet wired to a
scheduled job** in this repo; a production deployment should call it on a
cron (e.g. every few minutes) so stuck payments resolve without a client
ever hitting the status/reconcile endpoints.

## Error handling

Stellar submission failures are classified by `@mixmatch/stellar`'s
`classifyStellarPaymentError` into a stable `kind`, then wrapped as an
HTTP-facing `PaymentFailedError` (`payment-errors.ts`) with an appropriate
status code (e.g. `422` for `insufficient_balance`/`destination_not_found`,
`502` for `network_error`).

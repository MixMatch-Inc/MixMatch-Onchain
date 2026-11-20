# Escrow dispute and arbiter flow

Status: **proposed** (issue #1400; needs maintainer approval before this is relied on)

## Context

An escrow is `LOCKED` until the payer releases it to the payee or refunds it. If the parties disagree
there is no way to settle it. `docs/api-contract.md` lists `POST /escrow/{id}/dispute` but no such
endpoint exists. The escrow settlement in `EscrowService` is simulated in the database, so this design
covers application state; on-chain enforcement is listed as an open question.

## States

```
PENDING -> LOCKED -> RELEASED          (payer releases)
                  -> REFUNDED          (payer refunds)
                  -> DISPUTED -> RELEASED   (arbiter decides RELEASE)
                              -> REFUNDED   (arbiter decides REFUND)
```

A dispute has its own status: `OPEN` then `RESOLVED` (with `resolution` of `RELEASE` or `REFUND`).
`DISPUTED` blocks the normal release and refund actions, which both require `LOCKED`.

## Roles and rules

- The **payer** or the **payee** (when the payee public key belongs to a MixMatch account) can open a
  dispute on a `LOCKED` escrow, with a reason. One dispute per escrow.
- Either party can add **evidence notes** (text, up to 2000 characters) while the dispute is `OPEN`.
- An **arbiter** (`ARBITER` role; `ADMIN` can also act) sees the queue, reads the evidence, and resolves
  with `RELEASE` or `REFUND` and a required note. Resolution is final.
- An arbiter who is a party to the escrow cannot settle it.

## API

| Method and path | Who | Purpose |
| --- | --- | --- |
| `POST /api/escrows/{id}/dispute` | payer, payee | Open a dispute (`reason`) |
| `POST /api/escrows/{id}/dispute/evidence` | payer, payee | Add an evidence note |
| `GET /api/escrows/{id}/dispute` | parties, arbiter, admin | Dispute with its evidence |
| `GET /api/arbiter/disputes?status=OPEN` | arbiter, admin | Review queue |
| `POST /api/arbiter/disputes/{id}/resolve` | arbiter, admin | `resolution` and `note` |

Tables: `escrow_disputes` (one per escrow) and `escrow_evidence` (many per dispute); migration
`0002_escrow_disputes`.

## Open questions for the maintainers

1. **On-chain enforcement.** The Soroban contract must let a designated arbiter address call release
   or refund, otherwise the arbiter decision only changes database state. Needs a contract change.
2. **Who is the arbiter?** Staff only (current), or a per-escrow arbiter agreed at creation.
3. **Evidence attachments.** Only text notes are built; files would need object storage.
4. **Notifications** to the parties and the arbiter are not built.
5. **Deadlines.** There is no auto-resolution or timeout for an open dispute.

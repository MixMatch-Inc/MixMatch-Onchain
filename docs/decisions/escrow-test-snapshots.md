# Architectural Decision Record: Escrow test snapshots

## Status
**Decided**

## Context
Running `cargo test -p mixmatch-escrow` makes Soroban's test harness write JSON ledger snapshots under `contracts/escrow/test_snapshots/`. They are regenerated on every run and are ignored by git (`contracts/**/test_snapshots/` in `.gitignore`).

## Decision
Snapshots are **not committed**. They change whenever a test, a ledger default or the SDK changes, which produces large diffs that reviewers cannot meaningfully read; the assertions in the tests are the reviewed source of truth. The `.gitignore` rule stays as the single place that encodes this.

## Consequences
- Pull requests carry only test and contract changes.
- Behaviour that matters (balances, statuses, TTLs, errors) must be asserted in the tests themselves, not inferred from a snapshot.

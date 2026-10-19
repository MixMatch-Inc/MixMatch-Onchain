# Architectural Decision Record: `@mixmatch/stellar` API style

## Status
**Decided**

## Context
`@mixmatch/stellar` mixed two styles: `StellarPaymentService` was a class holding a client, while trustline, path-payment, multisig, escrow and streaming were free functions taking a `client`. The asset conversion helper `toStellarAsset` was copied into several modules.

## Decision
1. Free functions that take the client (or a params object containing it) are the canonical style. They are easy to tree-shake, compose and test with a stub client.
2. `StellarPaymentService` stays as a thin facade that delegates to `submitPayment`, `lookupPayment` and `resubmitPayment`, so existing API callers keep working. New payment features are added as functions first.
3. Shared helpers live in one module each. Asset conversion is `toStellarAsset` in `src/assets.ts`.

## Consequences
- One place to change asset handling.
- New modules follow the function style; the class can be deprecated once callers move over.

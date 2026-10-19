# @mixmatch/stellar

Stellar and Soroban helpers used by the API and mobile app.

## Public API

Everything below is exported from `@mixmatch/stellar`; SEP helpers are also available from the `@mixmatch/stellar/sep` subpath.

| Area | Exports |
| --- | --- |
| Types | `StellarNetwork`, `StellarAccountRef`, `StellarAssetRef`, `StellarClient` |
| Config & client | `loadStellarConfig`, `StellarConfig`, `DefaultStellarClient`, `createStellarClient` |
| Fees & timeouts | `resolveFee`, `buildFeeBump`, `DEFAULT_TRANSACTION_TIMEOUT_SECONDS`, `FeePercentile` |
| Wallets & accounts | `Wallet`, `KeypairWallet`, `VaultWallet`, `RemoteSigner`, `generateStellarAccount`, `fundTestnetAccount` |
| Payments | `StellarPaymentService`, `establishTrustline`, `findStrictSendPath`, `findStrictReceivePath`, `submitPathPayment`, `configureMultisig`, `buildHighValuePaymentEnvelope`, `coSignAndSubmitEnvelope`, `streamAccountPayments` |
| Errors | `StellarPaymentError`, `StellarPaymentErrorKind`, `classifyStellarPaymentError` |
| Escrow | `depositToEscrow`, `releaseEscrow`, `refundEscrow`, `getEscrow`, `SorobanInvocationError` |
| SEP | `fetchStellarToml`, `authenticateSep10`, `initiateSep24Deposit`, `initiateSep24Withdraw`, `getSep24Transaction` |

## Fees and timeouts

Every transaction fee comes from `resolveFee(client)`, which uses recent network fee stats (never below the protocol base fee). Wrap a transaction with `buildFeeBump` to have another account pay its fee.

Transactions are valid for `DEFAULT_TRANSACTION_TIMEOUT_SECONDS` (30). Pass `timeoutSeconds` to a payment, trustline, path-payment or multisig call to override it.

## Client typing

Functions accept the `StellarClient` interface (`horizon`, `soroban`, `networkPassphrase`, `getNetwork()`), so tests can pass `stubClient(...)` from `src/__tests__/test-helpers.ts` instead of casting.

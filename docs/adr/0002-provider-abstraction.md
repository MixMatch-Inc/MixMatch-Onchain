# ADR-0002: Stellar Provider Abstraction

**Status:** Accepted

**Date:** 2026-04-23

**Authors:** MixMatch Core Team

**Context:** Web3 payment integration, multi-chain support considerations

---

## Context

MixMatch uses Stellar for payment processing, escrow, and on-chain transactions. The current implementation directly imports Stellar SDK in service files, which creates tight coupling to Stellar-specific APIs.

Future considerations:
- Support for additional blockchains (Ethereum, Polygon)
- Testing without real blockchain interactions
- Switching between Stellar testnet and mainnet
- Provider upgrades and SDK version changes

## Decision

We will implement a provider abstraction layer for blockchain operations:

### Architecture

```
apps/stellar-service/src/
├── providers/
│   ├── blockchain.provider.ts      # Interface definition
│   ├── stellar.provider.ts         # Stellar SDK implementation
│   └── mock.provider.ts            # Testing implementation
├── services/
│   ├── payment.service.ts          # Uses provider interface
│   ├── escrow.service.ts           # Uses provider interface
│   └── account.service.ts          # Uses provider interface
└── config/
    └── stellar.ts                  # Provider initialization
```

### Provider Interface

```typescript
interface BlockchainProvider {
  createAccount(): Promise<Account>;
  sendPayment(params: PaymentParams): Promise<Transaction>;
  createEscrow(params: EscrowParams): Promise<EscrowAccount>;
  releaseEscrow(params: ReleaseParams): Promise<Transaction>;
  getTransaction(txHash: string): Promise<Transaction>;
}
```

## Consequences

### Positive

- Easy to swap blockchain providers
- Testable with mock implementations
- Clear separation of concerns
- Supports future multi-chain strategy
- SDK upgrades isolated to provider implementation

### Negative

- Additional abstraction layer adds complexity
- Interface must be maintained as features grow
- May not expose all Stellar-specific features

### Risks

- **Risk:** Interface becomes too generic, loses blockchain-specific capabilities
  - **Mitigation:** Extend interface with blockchain-specific methods when needed

- **Risk:** Mock provider drifts from real behavior
  - **Mitigation:** Integration tests against actual Stellar testnet

## Alternatives Considered

### Alternative 1: Direct SDK usage everywhere

- **Pros:** Simple, full access to Stellar features
- **Cons:** Tightly coupled, hard to test, hard to add other chains

### Alternative 2: Use existing library (e.g., web3.js wrapper)

- **Pros:** Battle-tested, community maintained
- **Cons:** May not fit MixMatch's specific needs, additional dependency

## References

- Stellar SDK documentation: https://stellar.github.io/js-stellar-sdk/
- Strategy Pattern (Gang of Four)

## Notes

- Provider abstraction implemented in Sprint 2
- Mock provider enables offline testing
- Consider adding provider health checks for production monitoring

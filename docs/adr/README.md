# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the MixMatch platform.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences. ADRs help teams understand why certain decisions were made and provide a historical record for future reference.

## Naming Convention

ADRs are numbered sequentially with a four-digit prefix:

```
NNNN-short-title.md
```

Examples:
- `0001-service-boundaries.md`
- `0002-provider-abstraction.md`
- `0003-mobile-first-playback.md`

## ADR Status

Each ADR has one of the following statuses:

- **Proposed** - Under review, not yet accepted
- **Accepted** - Decision has been approved and implemented
- **Deprecated** - No longer relevant, but kept for historical context
- **Superseded** - Replaced by a newer ADR (reference the superseding ADR)

## Creating a New ADR

1. Copy `template.md` to a new file with the next sequential number
2. Fill in all sections of the template
3. Set status to "Proposed"
4. Submit as a pull request
5. Update status to "Accepted" after approval and implementation

## Review Process

1. **Author** creates ADR with status "Proposed"
2. **Team review** during architecture discussion or PR review
3. **Core team approves** and merges the ADR
4. **Status updated** to "Accepted" once implementation begins
5. **Implementation** follows the decision documented in the ADR

## ADR Index

| Number | Title | Status | Date |
|--------|-------|--------|------|
| [0001](0001-service-boundaries.md) | Service Boundaries and Domain Organization | Accepted | 2026-04-23 |
| [0002](0002-provider-abstraction.md) | Stellar Provider Abstraction | Accepted | 2026-04-23 |
| [0003](0003-mobile-first-playback.md) | Mobile-First Playback Constraints | Accepted | 2026-04-23 |

## Related Documents

- [RFCs](../rfcs/README.md) - Request for Comments for larger proposals
- [Phase 1 Architecture](../phase-1-architecture.md) - Initial platform architecture
- [Roadmap](../../README.md) - Project roadmap and sprints

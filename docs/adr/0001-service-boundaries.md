# ADR-0001: Service Boundaries and Domain Organization

**Status:** Accepted

**Date:** 2026-04-23

**Authors:** MixMatch Core Team

**Context:** Platform foundation sprint, domain reset initiative

---

## Context

The MixMatch platform started with a feature-based module organization (`auth`, `bookings`, `discovery`, `payments`, `profiles`). As the platform evolves to support more complex user journeys, taste signals, and social features, we need a domain-driven architecture that scales.

The current structure makes it difficult to:
- Locate related functionality across modules
- Understand domain boundaries
- Onboard new contributors
- Maintain separation of concerns

## Decision

We will reorganize the API from feature-based modules to domain-driven bounded contexts:

### New Domain Structure

```
apps/api/src/domains/
├── identity/          # User accounts, authentication, profiles
├── journeys/          # Bookings, event planning workflows
├── discovery/         # DJ discovery, search, recommendations
├── resonance/         # Taste signals, reactions, matching algorithms
├── messaging/         # Communication between users
├── events/            # Event management and attendance
├── taste-signals/     # Music preferences, listening history
├── moderation/        # Content moderation, reporting
├── analytics/         # Usage tracking, insights
└── payments/          # Payment processing, escrow
```

### Domain Ownership Rules

1. Each domain owns its routes, controllers, services, and models
2. Domains communicate through well-defined interfaces (repositories, events)
3. No cross-domain direct model imports
4. Shared utilities remain in `packages/`

## Consequences

### Positive

- Clear domain boundaries improve code navigation
- Easier to assign ownership to team members
- Better alignment with MixMatch business domains
- Scales better as features grow
- New contributors can understand system structure faster

### Negative

- Initial migration requires moving many files
- Temporary risk of broken imports during transition
- Requires discipline to maintain boundaries

### Risks

- **Risk:** Domains become tightly coupled again
  - **Mitigation:** Enforce boundaries with linting rules and code review

- **Risk:** Over-engineering for current feature set
  - **Mitigation:** Keep placeholder domains minimal until needed

## Alternatives Considered

### Alternative 1: Keep feature-based modules

- **Pros:** No migration effort, familiar structure
- **Cons:** Doesn't scale, harder to understand domain relationships

### Alternative 2: Microservices architecture

- **Pros:** Strong isolation, independent deployment
- **Cons:** Overkill for current scale, operational complexity

## References

- Domain-Driven Design by Eric Evans
- MixMatch Roadmap Sprint 1 - Platform Foundation

## Notes

- Migration completed in Sprint 1
- Placeholder domains (resonance, messaging, etc.) will be populated as features are built
- Consider adding eslint-plugin-boundaries to enforce domain isolation

# Request for Comments (RFCs)

This directory contains Request for Comments (RFC) documents for larger architectural proposals and feature designs.

## What is an RFC?

An RFC is a detailed proposal for a significant change to the MixMatch platform. RFCs are used for:

- Major feature additions
- Architectural changes
- Technology stack decisions
- API design proposals
- Database schema changes
- Integration strategies

RFCs are more detailed than ADRs and focus on the "what" and "how" before implementation begins.

## RFC vs ADR

- **RFC** - Detailed proposal created **before** implementation to gather feedback
- **ADR** - Decision record created **after** the decision is made to document the rationale

RFCs often lead to one or more ADRs once the proposal is accepted and implementation begins.

## Naming Convention

RFCs are numbered sequentially with a four-digit prefix:

```
NNNN-short-title.md
```

Examples:
- `0001-taste-matching-algorithm.md`
- `0002-real-time-messaging.md`
- `0003-event-ticketing-integration.md`

## RFC Status

Each RFC has one of the following statuses:

- **Draft** - Initial proposal, incomplete or under discussion
- **In Review** - Ready for team review and feedback
- **Accepted** - Proposal approved, ready for implementation
- **Rejected** - Proposal declined (reasons documented)
- **Implemented** - Proposal has been fully implemented

## RFC Lifecycle

### 1. Draft Stage

1. Copy `template.md` to a new file with the next sequential number
2. Fill in all applicable sections
3. Set status to "Draft"
4. Share with team for initial feedback (optional)

### 2. Review Stage

1. Update RFC based on initial feedback
2. Set status to "In Review"
3. Create a pull request with the RFC
4. Tag relevant team members for review
5. Discuss in architecture meeting or PR comments
6. Address feedback and update RFC

### 3. Decision Stage

1. Core team makes decision (accept/reject)
2. Update status to "Accepted" or "Rejected"
3. If accepted:
   - Create implementation tasks/issues
   - Create ADR(s) to document key decisions
   - Begin implementation
4. If rejected:
   - Document reasons in RFC
   - Suggest alternatives if applicable

### 4. Implementation Stage

1. Implement according to RFC
2. Update RFC if significant changes are discovered
3. Update status to "Implemented" when complete
4. Link to implementation PRs

## Review Guidelines

When reviewing an RFC, consider:

- **Problem clarity** - Is the problem well-defined?
- **Solution fit** - Does the proposed solution address the problem?
- **Alternatives** - Are alternatives adequately considered?
- **Complexity** - Is the solution appropriately complex for the problem?
- **Impact** - What are the breaking changes, performance implications, security concerns?
- **Testability** - Can this be properly tested?
- **Maintainability** - Will this be easy to maintain long-term?

## RFC Index

| Number | Title | Status | Date |
|--------|-------|--------|------|
| *(No RFCs yet)* | | | |

## Related Documents

- [ADRs](../adr/README.md) - Architecture Decision Records
- [Phase 1 Architecture](../phase-1-architecture.md) - Initial platform architecture
- [Roadmap](../../README.md) - Project roadmap and sprints

## Contributing

We welcome RFCs from all contributors! If you have a significant proposal:

1. Check existing RFCs and ADRs to avoid duplicates
2. Discuss your idea informally with the team first
3. Follow the RFC template and lifecycle
4. Be open to feedback and iteration

For smaller changes (bug fixes, minor features), a pull request with clear description is sufficient - an RFC is not required.

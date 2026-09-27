# Architectural Decision Record: JWT Token Compatibility During Cutover

## Status
**Decided**

## Context
During the NestJS → FastAPI cutover of the payments API, JWTs already issued by the legacy backend must remain valid in the new service. The NestJS auth layer signs access tokens with `@nestjs/jwt` using a shared `JWT_SECRET` (HS256) and a fixed set of claims. If the FastAPI service decoded these tokens differently — different secret, algorithm set, or claim names — already-authenticated users would be logged out at cutover, and `x-user-id`-style header forwarding could drift from the canonical token identity.

To avoid re-issuing every active session, the new service must verify existing tokens exactly as the legacy service issued them, for a zero-downtime transition window.

## Decision
The FastAPI service uses `PyJWT` (already declared in `apps/api-py/pyproject.toml`) and verifies access tokens with parameters that exactly mirror the legacy `@nestjs/jwt` configuration:

1. **Secret**: the same `JWT_SECRET` value used by the NestJS service (`core.config.JWT_SECRET`).
2. **Algorithm**: HS256 only — decode with `algorithms=["HS256"]` and treat any other signing algorithm (`none`, RS*, etc.) as invalid.
3. **Claims**: verification succeeds when the token decodes correctly and carries the same claim contract the legacy service embedded (subject/user id, role, and expiry). Expiry validation (`exp`) is mandatory.
4. **Identity binding**: the logged-in identity is derived from the verified token subject, not from an unverified header. The temporary `x-user-id` header passthrough used while migration is in progress is accepted only for backward compatibility and must be dropped once all traffic is on the FastAPI service.

Existing tokens require no re-issue; no signature, algorithm, or claim-shape change is made during cutover.

## Consequences
- Existing sessions remain valid across the cutover (zero forced re-login).
- Verification surface is narrow (`algorithms=["HS256"]`), aligning with the small, predictable secret/claim contract.
- A future secret rotation or algorithm upgrade is a deliberate, separately planned change and must be sequenced to re-issue tokens before switching verification parameters.
- The compatibility path is temporary: it is removed after cutover monitoring confirms the legacy issuer is no longer issuing tokens.
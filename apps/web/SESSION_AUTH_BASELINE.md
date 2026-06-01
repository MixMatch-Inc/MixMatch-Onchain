# Web Session Auth Baseline

Covers: #392, #393, #394, #395

## Implementation Scope
- Session refresh happens before protected route render.
- Session introspection verifies active identity and expiry.
- Route gating redirects unauthenticated users to login.
- Expired sessions are cleared and routed with a user-facing reason.

## Contributor Lifecycle Expectations
- Fresh login should restore protected navigation without manual refresh.
- Mid-session expiry should redirect safely to login.
- Re-login should restore previous intended route.

## Regression Checks
- Protected route blocks anonymous access.
- Valid session reaches protected route.
- Expired session redirects and clears stale auth state.

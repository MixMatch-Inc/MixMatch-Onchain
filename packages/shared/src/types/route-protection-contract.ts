/**
 * Route Protection — Scope & Contracts
 *
 * Track: route protection | token persistence  |  Sprint 1
 * Issues: #783 (define scope and contracts), #784 (implement the core flow)
 *
 * Documents the boundary, middleware API, and acceptance criteria for the
 * route protection workstream. Implementation in:
 *   apps/api/src/modules/auth/auth.guard.ts
 *   apps/api/src/shared/middleware/auth.middleware.ts
 */

// ---------------------------------------------------------------------------
// Access levels
// ---------------------------------------------------------------------------

/** Fully public — no token required. Example: GET /health, POST /api/auth/register */
export interface PublicAccess {
  kind: "public";
}

/** Requires a valid JWT in the Authorization header. */
export interface AuthenticatedAccess {
  kind: "authenticated";
}

/** Requires authenticated + specific role. */
export interface RoleAccess {
  kind: "role";
  role: string;
}

/** Requires authenticated + the userId in the token to match a route param. */
export interface OwnershipAccess {
  kind: "ownership";
  /** Name of the route param holding the resource ID (e.g. "id") */
  paramId: string;
}

export type RouteAccess =
  | PublicAccess
  | AuthenticatedAccess
  | RoleAccess
  | OwnershipAccess;

// ---------------------------------------------------------------------------
// Route protection contract
// ---------------------------------------------------------------------------

/**
 * Typed declaration of a routes protection requirements.
 * Used to document and validate the access matrix for all API routes.
 */
export interface RouteProtectionContract {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  access: RouteAccess;
}

/**
 * The authoritative access matrix for all /api/auth/* routes.
 * This is the single source of truth — it must be kept in sync with
 * the actual route definitions in apps/api/src/modules/auth/auth.routes.ts.
 */
export const AUTH_ROUTE_PROTECTION: readonly RouteProtectionContract[] = [
  { path: "/api/auth/register", method: "POST",  access: { kind: "public" } },
  { path: "/api/auth/login",    method: "POST",  access: { kind: "public" } },
  { path: "/api/auth/refresh",  method: "POST",  access: { kind: "public" } },
  { path: "/api/auth/me",       method: "GET",   access: { kind: "authenticated" } },
  {
    path: "/api/auth/profile/:id",
    method: "PUT",
    access: { kind: "ownership", paramId: "id" },
  },
  {
    path: "/api/auth/admin/users",
    method: "GET",
    access: { kind: "role", role: "ADMIN" },
  },
] as const;

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

/**
 * Error codes produced by the route protection middleware:
 *
 * | Scenario                           | Code                       | HTTP |
 * |------------------------------------|----------------------------|------|
 * | Missing Authorization header       | INVALID_TOKEN              | 401  |
 * | Malformed Bearer token             | INVALID_TOKEN              | 401  |
 * | Expired token                      | TOKEN_EXPIRED              | 401  |
 * | Valid token but wrong role         | INSUFFICIENT_PERMISSIONS   | 403  |
 * | Valid token but wrong owner        | INSUFFICIENT_PERMISSIONS   | 403  |
 * | Missing resource param for owner   | VALIDATION_ERROR           | 400  |
 */
export type RouteProtectionErrorCode =
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "INSUFFICIENT_PERMISSIONS"
  | "VALIDATION_ERROR";

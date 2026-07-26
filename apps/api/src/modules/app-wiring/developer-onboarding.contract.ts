/**
 * Developer Onboarding — Scope & Contracts
 *
 * Track: developer onboarding  |  Sprint 1
 *
 * This module defines the boundary, inputs, and outputs for the
 * developer onboarding workstream. It is the single source of truth
 * for what "onboarding complete" means in this codebase.
 */

/** Phases of the local developer setup lifecycle */
export type OnboardingPhase =
  | "prerequisites-check"
  | "dependency-install"
  | "environment-config"
  | "database-setup"
  | "dev-server-start"
  | "smoke-test";

/** Shape of the onboarding status the setup script reports */
export interface OnboardingStatus {
  phase: OnboardingPhase;
  success: boolean;
  /** Human-readable message shown to the developer */
  message: string;
  /** Optional remediation hint shown on failure */
  hint?: string;
}

/**
 * Minimum environment configuration required before the API can start.
 * Validated in apps/api/src/shared/config/env.ts.
 */
export interface RequiredEnv {
  /** JWT signing secret — must be >= 32 characters */
  JWT_SECRET: string;
  /** Database connection URL for Prisma */
  DATABASE_URL: string;
  /** JWT access token expiry (e.g. "15m") */
  JWT_EXPIRES_IN: string;
}

/**
 * Acceptance criteria for the developer onboarding workstream.
 * A PR that touches this track MUST satisfy all of the following:
 *
 * 1. Scoped to current repo architecture (monorepo with pnpm workspaces).
 * 2. Reflects the auth-first foundation — no future systems assumed.
 * 3. Outputs are independently reviewable in a single PR.
 * 4. The quick-start flow (clone → install → migrate → pnpm dev) works
 *    end-to-end without manual intervention beyond .env setup.
 */
export type OnboardingContract = true; // marker — see docs/DEVELOPER_ONBOARDING.md

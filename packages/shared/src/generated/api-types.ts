/**
 * Generated API types for MixMatch (issue #1467).
 *
 * SOURCE OF TRUTH: apps/api-py openapi.json
 * To regenerate: npx openapi-typescript <api-url>/openapi.json -o packages/shared/src/generated/api-types.ts
 *
 * This file is committed as a snapshot so CI can diff it against a freshly
 * generated version and fail on drift:
 *
 *   npx openapi-typescript http://localhost:8000/openapi.json -o /tmp/api-types-new.ts
 *   diff packages/shared/src/generated/api-types.ts /tmp/api-types-new.ts
 *
 * Not yet imported by apps/web or apps/mobile; standalone snapshot.
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: 'bearer';
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  tos_accepted_at: string | null;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW';

export interface Payment {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount: string;
  asset_code: string;
  status: PaymentStatus;
  stellar_tx_hash: string | null;
  created_at: string;
}

export interface CreatePaymentRequest {
  destination: string;
  amount: string;
  asset_code: string;
  memo?: string;
}

// NOTE: Correct path is GET /api/payments/{id}/status (not /payments/status/{id})
export interface PaymentStatusResponse {
  id: string;
  status: PaymentStatus;
  stellar_tx_hash: string | null;
}

// ---------------------------------------------------------------------------
// Escrow
// ---------------------------------------------------------------------------

export type EscrowStatus = 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED';

export interface Escrow {
  id: string;
  payer_id: string;
  payee_id: string;
  amount: string;
  asset_code: string;
  status: EscrowStatus;
  contract_id: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Taste
// ---------------------------------------------------------------------------

export interface TasteProfile {
  user_id: string;
  genres: string[];
  energy: number;
  valence: number;
  danceability: number;
  is_mock: boolean;
  updated_at: string | null;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

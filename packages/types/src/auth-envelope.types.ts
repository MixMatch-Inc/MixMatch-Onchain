export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  code: string;
  message: string;
  details?: unknown;
}

export type ApiResponse<T> =
  | ApiSuccess<T>
  | ApiError;

/**
 * Backwards-compatible alias used by older auth clients and docs.
 * Keeping this alongside ApiResponse avoids duplicating envelope shapes
 * across web, mobile, and API workspaces.
 */
export type ApiEnvelope<T> = ApiResponse<T>;

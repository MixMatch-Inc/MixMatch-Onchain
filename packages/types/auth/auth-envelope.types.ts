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
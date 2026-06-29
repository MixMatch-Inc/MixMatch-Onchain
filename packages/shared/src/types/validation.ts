export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

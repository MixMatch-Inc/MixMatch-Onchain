import {
  ErrorCode,
  ErrorDomain,
  ErrorCategory,
  ERROR_CODE_CATEGORIES,
  MixMatchError,
  ValidationErrorDetail,
} from "./errors";

// Client-side error parsing utilities
export interface ParsedError {
  code: ErrorCode;
  domain: ErrorDomain;
  category: ErrorCategory;
  message: string;
  userMessage: string;
  isRetryable: boolean;
  isUserActionable: boolean;
  field?: string;
  validationErrors?: ValidationErrorDetail[];
  timestamp: string;
  requestId?: string;
}

export interface ErrorMapping {
  [key: string]: {
    title: string;
    description: string;
    action?: string;
    variant?: "error" | "warning" | "info";
  };
}

// UX-safe message mappings for common errors
export const ERROR_MESSAGES: ErrorMapping = {
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: {
    title: "Invalid Login",
    description: "The email or password you entered is incorrect.",
    action: "Please check your credentials and try again.",
    variant: "error",
  },
  [ErrorCode.AUTH_EMAIL_ALREADY_EXISTS]: {
    title: "Email Already Registered",
    description: "An account with this email already exists.",
    action: "Try logging in instead or use a different email.",
    variant: "error",
  },
  [ErrorCode.AUTH_TOKEN_EXPIRED]: {
    title: "Session Expired",
    description: "Your session has expired due to inactivity.",
    action: "Please log in again to continue.",
    variant: "warning",
  },
  [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: {
    title: "Access Denied",
    description: "You do not have permission to perform this action.",
    action: "Contact an administrator if you believe this is an error.",
    variant: "error",
  },
  [ErrorCode.PROVIDER_SYNC_CONNECTION_FAILED]: {
    title: "Connection Failed",
    description: "Unable to connect to the music service.",
    action: "Please try again in a few moments.",
    variant: "warning",
  },
  [ErrorCode.PROVIDER_SYNC_API_RATE_LIMIT]: {
    title: "Too Many Requests",
    description: "You have made too many requests to the music service.",
    action: "Please wait a moment and try again.",
    variant: "warning",
  },
  [ErrorCode.AUDIO_PREVIEW_GENERATION_FAILED]: {
    title: "Preview Unavailable",
    description: "We could not generate an audio preview for this track.",
    action: "Please try again later.",
    variant: "warning",
  },
  [ErrorCode.STELLAR_PAYMENT_INSUFFICIENT_BALANCE]: {
    title: "Insufficient Balance",
    description: "You do not have enough funds to complete this payment.",
    action: "Add funds to your account and try again.",
    variant: "error",
  },
  [ErrorCode.STELLAR_PAYMENT_NETWORK_ERROR]: {
    title: "Payment Network Error",
    description: "We are experiencing issues with the payment network.",
    action: "Please try again in a few moments.",
    variant: "warning",
  },
  [ErrorCode.INFRASTRUCTURE_RATE_LIMIT_EXCEEDED]: {
    title: "Rate Limit Exceeded",
    description: "You have made too many requests.",
    action: "Please wait a moment and try again.",
    variant: "warning",
  },
  [ErrorCode.INFRASTRUCTURE_MAINTENANCE_MODE]: {
    title: "System Maintenance",
    description: "We are currently performing maintenance.",
    action: "Please try again later.",
    variant: "info",
  },
  [ErrorCode.VALIDATION_INVALID_INPUT]: {
    title: "Invalid Input",
    description: "Please check your input and correct any errors.",
    action: "Review the highlighted fields and try again.",
    variant: "error",
  },
};

// Parse API error response into structured format
export function parseApiError(errorResponse: any): ParsedError | null {
  if (!errorResponse || !errorResponse.error) {
    return null;
  }

  const error = errorResponse.error;
  const category =
    (ERROR_CODE_CATEGORIES as Record<string, ErrorCategory>)[error.code] ||
    ErrorCategory.SYSTEM_ERROR;

  return {
    code: error.code,
    domain: error.domain,
    category,
    message: error.message,
    userMessage: error.userMessage,
    isRetryable: error.metadata?.retryable || false,
    isUserActionable: error.metadata?.userActionable || false,
    field: error.metadata?.field,
    validationErrors: error.metadata?.validationErrors,
    timestamp: error.timestamp,
    requestId: error.requestId,
  };
}

// Get UX-safe message for error code
export function getErrorMessage(errorCode: ErrorCode): ErrorMapping[string] {
  return (
    ERROR_MESSAGES[errorCode] || {
      title: "Error",
      description: "An unexpected error occurred.",
      action: "Please try again later.",
      variant: "error",
    }
  );
}

// Check if error is retryable
export function isRetryableError(error: ParsedError | null): boolean {
  if (!error) return false;
  return error.isRetryable || error.category === ErrorCategory.TEMPORARY_ERROR;
}

// Check if error requires user action
export function requiresUserAction(error: ParsedError | null): boolean {
  if (!error) return false;
  return error.isUserActionable || error.category === ErrorCategory.USER_ERROR;
}

// Get validation errors for form fields
export function getValidationErrors(
  error: ParsedError | null,
): Record<string, string> {
  if (!error || !error.validationErrors) return {};

  const errors: Record<string, string> = {};
  error.validationErrors.forEach((validationError) => {
    if (validationError.field !== "_form") {
      errors[validationError.field] = validationError.message;
    }
  });

  return errors;
}

// Get form-level validation errors
export function getFormErrors(error: ParsedError | null): string[] {
  if (!error || !error.validationErrors) return [];

  return error.validationErrors
    .filter((validationError) => validationError.field === "_form")
    .map((validationError) => validationError.message);
}

// React hook for error handling
export interface UseErrorHandlingReturn {
  error: ParsedError | null;
  errorMessage: ErrorMapping[string] | null;
  validationErrors: Record<string, string>;
  formErrors: string[];
  isRetryable: boolean;
  requiresAction: boolean;
  clearError: () => void;
  parseError: (errorResponse: any) => void;
}

export function createErrorParser() {
  let currentError: ParsedError | null = null;

  const parseError = (errorResponse: any): void => {
    currentError = parseApiError(errorResponse);
  };

  const clearError = (): void => {
    currentError = null;
  };

  const getErrorMessage = (): ErrorMapping[string] | null => {
    if (!currentError) return null;
    return (
      ERROR_MESSAGES[currentError.code] || {
        title: "Error",
        description: "An unexpected error occurred.",
        action: "Please try again later.",
        variant: "error",
      }
    );
  };

  const getValidationErrors = (): Record<string, string> => {
    if (!currentError || !currentError.validationErrors) return {};

    const errors: Record<string, string> = {};
    currentError.validationErrors.forEach((validationError) => {
      if (validationError.field !== "_form") {
        errors[validationError.field] = validationError.message;
      }
    });

    return errors;
  };

  const getFormErrors = (): string[] => {
    if (!currentError || !currentError.validationErrors) return [];

    return currentError.validationErrors
      .filter((validationError) => validationError.field === "_form")
      .map((validationError) => validationError.message);
  };

  return {
    get error() {
      return currentError;
    },
    get errorMessage() {
      return getErrorMessage();
    },
    get validationErrors() {
      return getValidationErrors();
    },
    get formErrors() {
      return getFormErrors();
    },
    get isRetryable() {
      return isRetryableError(currentError);
    },
    get requiresAction() {
      return requiresUserAction(currentError);
    },
    clearError,
    parseError,
  };
}

// Utility to check if error response is a MixMatch error
export function isMixMatchErrorResponse(response: any): boolean {
  return (
    response &&
    response.success === false &&
    response.error &&
    response.error.code &&
    response.error.domain
  );
}

// Utility to extract error from fetch response
export async function extractErrorFromResponse(
  response: Response,
): Promise<ParsedError | null> {
  try {
    const errorResponse = await response.json();
    return parseApiError(errorResponse);
  } catch {
    return null;
  }
}

// Error severity assessment
export function getErrorSeverity(
  error: ParsedError | null,
): "low" | "medium" | "high" | "critical" {
  if (!error) return "low";

  switch (error.category) {
    case ErrorCategory.USER_ERROR:
      return "low";
    case ErrorCategory.TEMPORARY_ERROR:
      return "medium";
    case ErrorCategory.PERMISSION_ERROR:
      return "high";
    case ErrorCategory.PAYMENT_ERROR:
      return "high";
    case ErrorCategory.SYSTEM_ERROR:
      return "critical";
    default:
      return "medium";
  }
}

// Retry delay calculation for retryable errors
export function getRetryDelay(
  error: ParsedError | null,
  attemptNumber: number = 1,
): number {
  if (!error || !isRetryableError(error)) return 0;

  // Exponential backoff with jitter
  const baseDelay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 30000);
  const jitter = Math.random() * 0.1 * baseDelay;

  return Math.floor(baseDelay + jitter);
}

// Safely read a nested property from globalThis without relying on DOM lib types.
// Using `(globalThis as any)` is intentional — this package has no DOM lib and
// we must not reference browser globals (window, self, Navigator, Location) directly.
function getGlobalProp(key: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof globalThis !== "undefined" ? (globalThis as any)[key] : undefined;
}

// Error logging utility
export function logError(
  error: ParsedError | null,
  context?: Record<string, any>,
): void {
  if (!error) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = getGlobalProp("navigator") as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loc = getGlobalProp("location") as any;

  const logData = {
    ...error,
    context,
    userAgent: typeof nav?.userAgent === "string" ? nav.userAgent : undefined,
    timestamp: new Date().toISOString(),
  };

  // In development, log to console
  if (typeof loc?.hostname === "string" && loc.hostname === "localhost") {
    console.error("MixMatch Error:", logData);
  }

  // In production, you might want to send to error tracking service
  // Example: Sentry.captureException(logData);
}
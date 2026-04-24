import { 
  parseApiError, 
  getErrorMessage, 
  getValidationErrors, 
  getFormErrors, 
  isRetryableError,
  requiresUserAction,
  ParsedError,
  createErrorParser
} from '@mixmatch/types';

// React hook for error handling
export function useErrorHandler() {
  const errorParser = createErrorParser();

  const handleError = (errorResponse: any) => {
    errorParser.parseError(errorResponse);
  };

  const clearError = () => {
    errorParser.clearError();
  };

  return {
    error: errorParser.error,
    errorMessage: errorParser.errorMessage,
    validationErrors: errorParser.validationErrors,
    formErrors: errorParser.formErrors,
    isRetryable: errorParser.isRetryable,
    requiresAction: errorParser.requiresAction,
    handleError,
    clearError,
  };
}

// Error message component props
export interface ErrorDisplayProps {
  error: ParsedError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

// Error display component (can be used with any UI framework)
export function getErrorDisplayProps(error: ParsedError | null, onRetry?: () => void, onDismiss?: () => void) {
  if (!error) return null;

  const errorMessage = getErrorMessage(error.code);
  const validationErrors = getValidationErrors(error);
  const formErrors = getFormErrors(error);
  const isRetryable = isRetryableError(error);
  const requiresAction = requiresUserAction(error);

  return {
    title: errorMessage?.title || 'Error',
    description: errorMessage?.description || error.userMessage,
    action: errorMessage?.action,
    variant: errorMessage?.variant || 'error',
    validationErrors,
    formErrors,
    isRetryable,
    requiresAction,
    showRetryButton: isRetryable && !!onRetry,
    showDismissButton: !!onDismiss,
    error,
  };
}

// Specific error handlers for different contexts
export const ErrorHandlers = {
  // Auth error handlers
  auth: {
    isAuthError: (error: ParsedError | null) => 
      error?.domain === 'AUTH',
    
    needsLogin: (error: ParsedError | null) => 
      error?.code === 'AUTH_001' || // Invalid credentials
      error?.code === 'AUTH_003' || // Token expired
      error?.code === 'AUTH_004', // Token invalid
    
    needsRegistration: (error: ParsedError | null) => 
      error?.code === 'AUTH_005', // User not found
    
    needsOnboarding: (error: ParsedError | null) => 
      error?.code === 'AUTH_007', // Onboarding incomplete
  },

  // Payment error handlers
  payment: {
    isPaymentError: (error: ParsedError | null) => 
      error?.domain === 'STELLAR_PAYMENT',
    
    needsFunds: (error: ParsedError | null) => 
      error?.code === 'STELLAR_PAYMENT_001', // Insufficient balance
    
    networkIssue: (error: ParsedError | null) => 
      error?.code === 'STELLAR_PAYMENT_002' || // Network error
      error?.code === 'STELLAR_PAYMENT_008', // Horizon down
    
    invalidDestination: (error: ParsedError | null) => 
      error?.code === 'STELLAR_PAYMENT_004', // Invalid destination
  },

  // Validation error handlers
  validation: {
    isValidationError: (error: ParsedError | null) => 
      error?.domain === 'VALIDATION',
    
    getFieldError: (error: ParsedError | null, field: string) => 
      getValidationErrors(error)[field],
    
    hasFieldErrors: (error: ParsedError | null) => 
      Object.keys(getValidationErrors(error)).length > 0,
    
    hasFormErrors: (error: ParsedError | null) => 
      getFormErrors(error).length > 0,
  },

  // Infrastructure error handlers
  infrastructure: {
    isInfrastructureError: (error: ParsedError | null) => 
      error?.domain === 'INFRASTRUCTURE',
    
    isMaintenance: (error: ParsedError | null) => 
      error?.code === 'INFRASTRUCTURE_006', // Maintenance mode
    
    isRateLimit: (error: ParsedError | null) => 
      error?.code === 'INFRASTRUCTURE_005', // Rate limit exceeded
  },
};

// Error context for different parts of the app
export type ErrorContext = 
  | 'auth' 
  | 'profile' 
  | 'booking' 
  | 'payment' 
  | 'discovery' 
  | 'messaging' 
  | 'events';

// Context-specific error handling
export function getErrorHandlerForContext(context: ErrorContext) {
  switch (context) {
    case 'auth':
      return {
        shouldRedirectToLogin: (error: ParsedError | null) => 
          ErrorHandlers.auth.needsLogin(error),
        shouldRedirectToRegister: (error: ParsedError | null) => 
          ErrorHandlers.auth.needsRegistration(error),
        shouldRedirectToOnboarding: (error: ParsedError | null) => 
          ErrorHandlers.auth.needsOnboarding(error),
      };

    case 'payment':
      return {
        shouldShowAddFunds: (error: ParsedError | null) => 
          ErrorHandlers.payment.needsFunds(error),
        shouldRetryPayment: (error: ParsedError | null) => 
          ErrorHandlers.payment.networkIssue(error),
        shouldCheckDestination: (error: ParsedError | null) => 
          ErrorHandlers.payment.invalidDestination(error),
      };

    case 'profile':
      return {
        shouldShowValidationErrors: (error: ParsedError | null) => 
          ErrorHandlers.validation.hasFieldErrors(error),
        shouldShowFormErrors: (error: ParsedError | null) => 
          ErrorHandlers.validation.hasFormErrors(error),
      };

    default:
      return {
        shouldShowGenericError: (error: ParsedError | null) => !!error,
        shouldShowRetryButton: (error: ParsedError | null) => 
          isRetryableError(error),
      };
  }
}

// Utility to handle API responses
export async function handleApiResponse<T>(
  response: Response,
  onSuccess: (data: T) => void,
  onError?: (error: ParsedError | null) => void
): Promise<void> {
  if (!response.ok) {
    const error = await parseApiError(await response.json());
    onError?.(error);
    return;
  }

  try {
    const data = await response.json();
    onSuccess(data);
  } catch (error) {
    const parsedError = parseApiError({
      success: false,
      error: {
        code: 'INFRASTRUCTURE_001',
        domain: 'INFRASTRUCTURE',
        message: 'Failed to parse response',
        userMessage: 'We received an unexpected response. Please try again.',
        timestamp: new Date().toISOString(),
      },
    });
    onError?.(parsedError);
  }
}

// Error logging utility for client side
export function logClientError(error: ParsedError | null, context?: Record<string, any>): void {
  if (!error) return;

  const logData = {
    ...error,
    context,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    timestamp: new Date().toISOString(),
  };

  // In development, log to console
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.error('MixMatch Client Error:', logData);
  }

  // In production, you might want to send to error tracking service
  // Example: Sentry.captureException(logData);
}

// Retry utility with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Export commonly used error checking functions
export {
  parseApiError,
  getErrorMessage,
  getValidationErrors,
  getFormErrors,
  isRetryableError,
  requiresUserAction,
  type ParsedError,
};

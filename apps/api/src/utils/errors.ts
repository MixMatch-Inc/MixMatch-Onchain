import {
  ErrorCode,
  ErrorDomain,
  ErrorMetadata,
  MixMatchError,
} from "@mixmatch/types";

export class MixMatchErrorBase extends Error {
  public readonly code: ErrorCode;
  public readonly domain: ErrorDomain;
  public readonly userMessage: string;
  public readonly metadata?: ErrorMetadata;
  public readonly timestamp: string;
  public readonly requestId?: string;

  constructor(
    code: ErrorCode,
    domain: ErrorDomain,
    message: string,
    userMessage: string,
    metadata?: ErrorMetadata,
    requestId?: string,
  ) {
    super(message);
    this.name = "MixMatchError";
    this.code = code;
    this.domain = domain;
    this.userMessage = userMessage;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;

    // Maintains proper stack trace for where our error was thrown
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, MixMatchErrorBase);
    }
  }

  toJSON(): MixMatchError {
    return {
      code: this.code,
      domain: this.domain,
      message: this.message,
      userMessage: this.userMessage,
      metadata: this.metadata,
      timestamp: this.timestamp,
      requestId: this.requestId,
    };
  }
}

// Auth Error Classes
export class AuthError extends MixMatchErrorBase {
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    metadata?: ErrorMetadata,
    requestId?: string,
  ) {
    super(code, ErrorDomain.AUTH, message, userMessage, metadata, requestId);
    this.name = "AuthError";
  }

  static invalidCredentials(requestId?: string) {
    return new AuthError(
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      "Invalid email or password combination",
      "The email or password you entered is incorrect. Please check your credentials and try again.",
      { retryable: false, userActionable: true },
      requestId,
    );
  }

  static emailAlreadyExists(email: string, requestId?: string) {
    return new AuthError(
      ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
      `Email ${email} is already registered`,
      "An account with this email already exists. Please use a different email or try logging in.",
      { field: "email", value: email, retryable: false, userActionable: true },
      requestId,
    );
  }

  static tokenExpired(requestId?: string) {
    return new AuthError(
      ErrorCode.AUTH_TOKEN_EXPIRED,
      "Authentication token has expired",
      "Your session has expired. Please log in again to continue.",
      { retryable: true, userActionable: true },
      requestId,
    );
  }

  static tokenInvalid(requestId?: string) {
    return new AuthError(
      ErrorCode.AUTH_TOKEN_INVALID,
      "Invalid authentication token",
      "Your authentication is invalid. Please log in again.",
      { retryable: false, userActionable: true },
      requestId,
    );
  }

  static userNotFound(requestId?: string) {
    return new AuthError(
      ErrorCode.AUTH_USER_NOT_FOUND,
      "User not found",
      "We could not find your account. Please check your credentials or sign up.",
      { retryable: false, userActionable: true },
      requestId,
    );
  }

  static insufficientPermissions(requiredRole: string, requestId?: string) {
    return new AuthError(
      ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
      `Insufficient permissions. Required role: ${requiredRole}`,
      "You do not have permission to perform this action. Contact an administrator if you believe this is an error.",
      { context: { requiredRole }, retryable: false, userActionable: false },
      requestId,
    );
  }

  static onboardingIncomplete(requestId?: string) {
    return new AuthError(
      ErrorCode.AUTH_ONBOARDING_INCOMPLETE,
      "User onboarding not completed",
      "Please complete your profile setup to access this feature.",
      { retryable: false, userActionable: true },
      requestId,
    );
  }
}

// Provider Sync Error Classes
export class ProviderSyncError extends MixMatchErrorBase {
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    metadata?: ErrorMetadata,
    requestId?: string,
  ) {
    super(
      code,
      ErrorDomain.PROVIDER_SYNC,
      message,
      userMessage,
      metadata,
      requestId,
    );
    this.name = "ProviderSyncError";
  }

  static connectionFailed(provider: string, requestId?: string) {
    return new ProviderSyncError(
      ErrorCode.PROVIDER_SYNC_CONNECTION_FAILED,
      `Failed to connect to ${provider}`,
      "We are having trouble connecting to the music service. Please try again in a few moments.",
      { context: { provider }, retryable: true, userActionable: false },
      requestId,
    );
  }

  static rateLimitExceeded(provider: string, requestId?: string) {
    return new ProviderSyncError(
      ErrorCode.PROVIDER_SYNC_API_RATE_LIMIT,
      `Rate limit exceeded for ${provider}`,
      "Too many requests to the music service. Please wait a moment and try again.",
      { context: { provider }, retryable: true, userActionable: false },
      requestId,
    );
  }

  static invalidCredentials(provider: string, requestId?: string) {
    return new ProviderSyncError(
      ErrorCode.PROVIDER_SYNC_INVALID_CREDENTIALS,
      `Invalid credentials for ${provider}`,
      "Your music service credentials are invalid. Please update your connection settings.",
      { context: { provider }, retryable: false, userActionable: true },
      requestId,
    );
  }
}

// Audio Preview Error Classes
export class AudioPreviewError extends MixMatchErrorBase {
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    metadata?: ErrorMetadata,
    requestId?: string,
  ) {
    super(
      code,
      ErrorDomain.AUDIO_PREVIEW,
      message,
      userMessage,
      metadata,
      requestId,
    );
    this.name = "AudioPreviewError";
  }

  static generationFailed(trackId: string, requestId?: string) {
    return new AudioPreviewError(
      ErrorCode.AUDIO_PREVIEW_GENERATION_FAILED,
      `Failed to generate audio preview for track ${trackId}`,
      "We could not generate an audio preview for this track. Please try again later.",
      { context: { trackId }, retryable: true, userActionable: false },
      requestId,
    );
  }

  static fileNotFound(previewId: string, requestId?: string) {
    return new AudioPreviewError(
      ErrorCode.AUDIO_PREVIEW_FILE_NOT_FOUND,
      `Audio preview file not found: ${previewId}`,
      "The audio preview is no longer available. Please refresh and try again.",
      { context: { previewId }, retryable: false, userActionable: true },
      requestId,
    );
  }

  static formatUnsupported(format: string, requestId?: string) {
    return new AudioPreviewError(
      ErrorCode.AUDIO_PREVIEW_FORMAT_UNSUPPORTED,
      `Unsupported audio format: ${format}`,
      "This audio format is not supported. Please use a different file format.",
      { context: { format }, retryable: false, userActionable: true },
      requestId,
    );
  }
}

// Stellar Payment Error Classes
export class StellarPaymentError extends MixMatchErrorBase {
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    metadata?: ErrorMetadata,
    requestId?: string,
  ) {
    super(
      code,
      ErrorDomain.STELLAR_PAYMENT,
      message,
      userMessage,
      metadata,
      requestId,
    );
    this.name = "StellarPaymentError";
  }

  static insufficientBalance(
    required: string,
    available: string,
    requestId?: string,
  ) {
    return new StellarPaymentError(
      ErrorCode.STELLAR_PAYMENT_INSUFFICIENT_BALANCE,
      `Insufficient balance. Required: ${required}, Available: ${available}`,
      "You do not have enough funds in your account to complete this payment.",
      {
        context: { required, available },
        retryable: false,
        userActionable: true,
      },
      requestId,
    );
  }

  static networkError(requestId?: string) {
    return new StellarPaymentError(
      ErrorCode.STELLAR_PAYMENT_NETWORK_ERROR,
      "Stellar network error",
      "We are experiencing issues with the payment network. Please try again in a few moments.",
      { retryable: true, userActionable: false },
      requestId,
    );
  }

  static transactionFailed(txHash: string, requestId?: string) {
    return new StellarPaymentError(
      ErrorCode.STELLAR_PAYMENT_TRANSACTION_FAILED,
      `Transaction failed: ${txHash}`,
      "Your payment could not be processed. Please check your account details and try again.",
      { context: { txHash }, retryable: false, userActionable: true },
      requestId,
    );
  }

  static invalidDestination(address: string, requestId?: string) {
    return new StellarPaymentError(
      ErrorCode.STELLAR_PAYMENT_INVALID_DESTINATION,
      `Invalid destination address: ${address}`,
      "The payment destination is invalid. Please check the recipient address.",
      {
        field: "destination",
        value: address,
        retryable: false,
        userActionable: true,
      },
      requestId,
    );
  }

  static horizonDown(requestId?: string) {
    return new StellarPaymentError(
      ErrorCode.STELLAR_PAYMENT_HORIZON_DOWN,
      "Stellar Horizon service is down",
      "The payment service is temporarily unavailable. Please try again later.",
      { retryable: true, userActionable: false },
      requestId,
    );
  }
}

// Infrastructure Error Classes
export class InfrastructureError extends MixMatchErrorBase {
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    metadata?: ErrorMetadata,
    requestId?: string,
  ) {
    super(
      code,
      ErrorDomain.INFRASTRUCTURE,
      message,
      userMessage,
      metadata,
      requestId,
    );
    this.name = "InfrastructureError";
  }

  static databaseError(operation: string, requestId?: string) {
    return new InfrastructureError(
      ErrorCode.INFRASTRUCTURE_DATABASE_ERROR,
      `Database error during ${operation}`,
      "We are experiencing technical difficulties. Please try again later.",
      { context: { operation }, retryable: true, userActionable: false },
      requestId,
    );
  }

  static cacheError(operation: string, requestId?: string) {
    return new InfrastructureError(
      ErrorCode.INFRASTRUCTURE_CACHE_ERROR,
      `Cache error during ${operation}`,
      "We are experiencing technical difficulties. Please try again later.",
      { context: { operation }, retryable: true, userActionable: false },
      requestId,
    );
  }

  static rateLimitExceeded(limit: number, window: string, requestId?: string) {
    return new InfrastructureError(
      ErrorCode.INFRASTRUCTURE_RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded: ${limit} requests per ${window}`,
      "You have made too many requests. Please wait a moment and try again.",
      { context: { limit, window }, retryable: true, userActionable: true },
      requestId,
    );
  }

  static maintenanceMode(requestId?: string) {
    return new InfrastructureError(
      ErrorCode.INFRASTRUCTURE_MAINTENANCE_MODE,
      "System is in maintenance mode",
      "We are currently performing maintenance. Please try again later.",
      { retryable: true, userActionable: false },
      requestId,
    );
  }
}

// Validation Error Classes
export class ValidationError extends MixMatchErrorBase {
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    metadata?: ErrorMetadata,
    requestId?: string,
  ) {
    super(
      code,
      ErrorDomain.VALIDATION,
      message,
      userMessage,
      metadata,
      requestId,
    );
    this.name = "ValidationError";
  }

  static invalidInput(
    field: string,
    value: unknown,
    reason?: string,
    requestId?: string,
  ) {
    return new ValidationError(
      ErrorCode.VALIDATION_INVALID_INPUT,
      `Invalid input for field ${field}: ${reason || "value is invalid"}`,
      `The ${field} you provided is not valid. ${reason || "Please check your input."}`,
      { field, value, retryable: false, userActionable: true },
      requestId,
    );
  }

  static requiredFieldMissing(field: string, requestId?: string) {
    return new ValidationError(
      ErrorCode.VALIDATION_REQUIRED_FIELD_MISSING,
      `Required field missing: ${field}`,
      `The ${field} field is required. Please provide this information.`,
      { field, retryable: false, userActionable: true },
      requestId,
    );
  }

  static outOfRange(
    field: string,
    value: number,
    min: number,
    max: number,
    requestId?: string,
  ) {
    return new ValidationError(
      ErrorCode.VALIDATION_OUT_OF_RANGE,
      `Value out of range for ${field}: ${value} (expected ${min}-${max})`,
      `The ${field} must be between ${min} and ${max}.`,
      {
        field,
        value,
        context: { min, max },
        retryable: false,
        userActionable: true,
      },
      requestId,
    );
  }
}

// Utility function to check if an error is a MixMatchError
export function isMixMatchError(error: unknown): error is MixMatchErrorBase {
  return error instanceof MixMatchErrorBase;
}

// Utility function to create error from unknown error
export function createErrorFromUnknown(
  error: unknown,
  requestId?: string,
): MixMatchErrorBase {
  if (isMixMatchError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Handle common error types
    if (error.name === "ValidationError") {
      return ValidationError.invalidInput(
        "unknown",
        error.message,
        error.message,
        requestId,
      );
    }

    if (
      error.name === "MongoError" ||
      error.message.indexOf("MongoDB") !== -1
    ) {
      return InfrastructureError.databaseError("unknown", requestId);
    }

    // Generic infrastructure error for unhandled exceptions
    return InfrastructureError.databaseError("unknown", requestId);
  }

  // Handle string errors
  if (typeof error === "string") {
    return new InfrastructureError(
      ErrorCode.INFRASTRUCTURE_DATABASE_ERROR,
      error,
      "We are experiencing technical difficulties. Please try again later.",
      undefined,
      requestId,
    );
  }

  // Fallback for unknown error types
  return new InfrastructureError(
    ErrorCode.INFRASTRUCTURE_DATABASE_ERROR,
    "Unknown error occurred",
    "We are experiencing technical difficulties. Please try again later.",
    undefined,
    requestId,
  );
}

import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ErrorCode, ErrorDomain, ValidationErrorDetail } from "@mixmatch/types";
import {
  isMixMatchError,
  createErrorFromUnknown,
  ValidationError,
} from "../utils/errors";

// HTTP status code mapping for error domains
const getStatusForError = (domain: ErrorDomain, code: ErrorCode): number => {
  switch (domain) {
    case ErrorDomain.AUTH:
      switch (code) {
        case ErrorCode.AUTH_INVALID_CREDENTIALS:
        case ErrorCode.AUTH_TOKEN_INVALID:
          return 401;
        case ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS:
        case ErrorCode.AUTH_ACCOUNT_LOCKED:
          return 403;
        case ErrorCode.AUTH_EMAIL_ALREADY_EXISTS:
          return 409;
        default:
          return 400;
      }

    case ErrorDomain.PROVIDER_SYNC:
      switch (code) {
        case ErrorCode.PROVIDER_SYNC_SERVICE_UNAVAILABLE:
          return 503;
        case ErrorCode.PROVIDER_SYNC_API_RATE_LIMIT:
        case ErrorCode.PROVIDER_SYNC_QUOTA_EXCEEDED:
          return 429;
        case ErrorCode.PROVIDER_SYNC_INVALID_CREDENTIALS:
          return 401;
        default:
          return 502;
      }

    case ErrorDomain.AUDIO_PREVIEW:
      switch (code) {
        case ErrorCode.AUDIO_PREVIEW_FILE_NOT_FOUND:
          return 404;
        case ErrorCode.AUDIO_PREVIEW_SIZE_EXCEEDED:
        case ErrorCode.AUDIO_PREVIEW_FORMAT_UNSUPPORTED:
          return 413;
        default:
          return 500;
      }

    case ErrorDomain.ANONYMITY_REVEAL:
      switch (code) {
        case ErrorCode.ANONYMITY_REVEAL_PREMIUM_REQUIRED:
          return 402;
        case ErrorCode.ANONYMITY_REVEAL_NOT_ALLOWED:
        case ErrorCode.ANONYMITY_REVEAL_POLICY_VIOLATION:
          return 403;
        default:
          return 400;
      }

    case ErrorDomain.COMPATIBILITY_SCORING:
      switch (code) {
        case ErrorCode.COMPATIBILITY_SCORING_INSUFFICIENT_DATA:
        case ErrorCode.COMPATIBILITY_SCORING_PROFILE_INCOMPLETE:
        case ErrorCode.COMPATIBILITY_SCORING_INVALID_INPUTS:
          return 400;
        default:
          return 500;
      }

    case ErrorDomain.MESSAGING_UNLOCK:
      switch (code) {
        case ErrorCode.MESSAGING_UNLOCK_PREMIUM_REQUIRED:
          return 402;
        case ErrorCode.MESSAGING_UNLOCK_BLOCKED_USER:
        case ErrorCode.MESSAGING_UNLOCK_MUTED:
        case ErrorCode.MESSAGING_UNLOCK_CONTENT_POLICY:
          return 403;
        case ErrorCode.MESSAGING_UNLOCK_RATE_LIMIT:
          return 429;
        default:
          return 400;
      }

    case ErrorDomain.EVENT_PARTICIPATION:
      switch (code) {
        case ErrorCode.EVENT_PARTICIPATION_NOT_INVITED:
        case ErrorCode.EVENT_PARTICIPATION_BANNED:
        case ErrorCode.EVENT_PARTICIPATION_GEO_RESTRICTED:
          return 403;
        case ErrorCode.EVENT_PARTICIPATION_FULL:
          return 409;
        case ErrorCode.EVENT_PARTICIPATION_NOT_STARTED:
        case ErrorCode.EVENT_PARTICIPATION_ENDED:
          return 410;
        default:
          return 400;
      }

    case ErrorDomain.STELLAR_PAYMENT:
      switch (code) {
        case ErrorCode.STELLAR_PAYMENT_INSUFFICIENT_BALANCE:
        case ErrorCode.STELLAR_PAYMENT_INVALID_DESTINATION:
        case ErrorCode.STELLAR_PAYMENT_INVALID_ASSET:
        case ErrorCode.STELLAR_PAYMENT_TRUSTLINE_MISSING:
          return 400;
        case ErrorCode.STELLAR_PAYMENT_FEE_TOO_HIGH:
          return 402;
        case ErrorCode.STELLAR_PAYMENT_NETWORK_ERROR:
        case ErrorCode.STELLAR_PAYMENT_HORIZON_DOWN:
          return 503;
        default:
          return 500;
      }

    case ErrorDomain.INFRASTRUCTURE:
      switch (code) {
        case ErrorCode.INFRASTRUCTURE_RATE_LIMIT_EXCEEDED:
          return 429;
        case ErrorCode.INFRASTRUCTURE_MAINTENANCE_MODE:
          return 503;
        default:
          return 500;
      }

    case ErrorDomain.VALIDATION:
      return 400;

    default:
      return 500;
  }
};

// Helper to get request ID from headers or generate one
const getRequestId = (req: Request): string => {
  const existingId = req.headers["x-request-id"] || req.headers["request-id"];
  return existingId
    ? String(existingId)
    : `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Convert ZodError to ValidationError
const convertZodError = (
  zodError: ZodError,
  requestId: string,
): ValidationError => {
  const validationErrors: ValidationErrorDetail[] = [];

  // Field errors
  const fieldErrors = zodError.flatten().fieldErrors as Record<
    string,
    string[]
  >;
  for (const field in fieldErrors) {
    const messages = fieldErrors[field];
    messages?.forEach((message: string) => {
      validationErrors.push({
        field,
        message,
      });
    });
  }

  // Form errors
  zodError.flatten().formErrors.forEach((message) => {
    validationErrors.push({
      field: "_form",
      message,
    });
  });

  return new ValidationError(
    ErrorCode.VALIDATION_INVALID_INPUT,
    "Validation failed",
    "Please check your input and correct any errors.",
    {
      retryable: false,
      userActionable: true,
      context: { validationErrors },
    },
    requestId,
  );
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = getRequestId(req);

  // Handle Zod validation errors first
  if (error instanceof ZodError) {
    const validationError = convertZodError(error, requestId);
    const status = getStatusForError(
      validationError.domain,
      validationError.code,
    );

    res.status(status).json({
      success: false,
      error: validationError.toJSON(),
    });
    return;
  }

  // Handle MixMatch structured errors
  if (isMixMatchError(error)) {
    const status = getStatusForError(error.domain, error.code);

    res.status(status).json({
      success: false,
      error: error.toJSON(),
    });
    return;
  }

  // Convert unknown errors to MixMatch errors
  const mixMatchError = createErrorFromUnknown(error, requestId);
  const status = getStatusForError(mixMatchError.domain, mixMatchError.code);

  // Log the original error for debugging
  console.error("Unhandled error:", {
    originalError: error,
    convertedError: mixMatchError.toJSON(),
    requestId,
    path: req.path,
    method: req.method,
  });

  res.status(status).json({
    success: false,
    error: mixMatchError.toJSON(),
  });
};

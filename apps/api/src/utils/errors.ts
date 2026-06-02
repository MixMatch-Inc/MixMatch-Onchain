export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 500) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const AuthError = {
  emailAlreadyExists: (email: string) =>
    new ApiError(
      "AUTH_EMAIL_EXISTS",
      `Email ${email} is already registered`,
      409,
    ),
  invalidCredentials: () =>
    new ApiError("AUTH_INVALID_CREDENTIALS", "Invalid email or password", 401),
  unauthorized: () => new ApiError("AUTH_UNAUTHORIZED", "Unauthorized", 401),
  invalidOwnershipProof: () =>
    new ApiError(
      "AUTH_INVALID_OWNERSHIP_PROOF",
      "Invalid or expired ownership proof challenge",
      401,
    ),
  invalidRecoveryToken: () =>
    new ApiError(
      "AUTH_INVALID_RECOVERY_TOKEN",
      "Invalid or expired recovery token",
      401,
    ),
  accountNotRecoverable: () =>
    new ApiError(
      "AUTH_ACCOUNT_NOT_RECOVERABLE",
      "Account cannot be recovered with the provided ownership proof",
      409,
    ),
};

export const ValidationError = {
  invalidInput: (field: string, value: unknown, message: string) =>
    new ApiError("VALIDATION_INVALID_INPUT", `${message} for ${field}`, 422),
};

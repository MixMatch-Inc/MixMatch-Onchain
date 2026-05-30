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
    new ApiError("AUTH_EMAIL_EXISTS", `Email ${email} is already registered`, 409),
  invalidCredentials: () =>
    new ApiError("AUTH_INVALID_CREDENTIALS", "Invalid email or password", 401),
  unauthorized: () =>
    new ApiError("AUTH_UNAUTHORIZED", "Unauthorized", 401),
};

export const ValidationError = {
  invalidInput: (field: string, value: unknown, message: string) =>
    new ApiError("VALIDATION_INVALID_INPUT", `${message} for ${field}`, 422),
};

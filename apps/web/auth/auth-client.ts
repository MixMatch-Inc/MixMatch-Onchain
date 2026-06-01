import type {
  ApiError,
  AuthSession,
  IntrospectResponse,
  LoginRequest,
  SessionLogoutResponse,
  SessionRefreshResponse,
  SignupRequest,
} from "@themixmatch/types";

type AuthClientErrorKind = "network" | "http" | "api" | "invalid_response";

export class AuthClientError extends Error {
  kind: AuthClientErrorKind;
  status?: number;
  code?: string;
  details?: unknown;

  constructor(
    kind: AuthClientErrorKind,
    message: string,
    options?: { status?: number; code?: string; details?: unknown },
  ) {
    super(message);
    this.kind = kind;
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isApiError = (value: unknown): value is ApiError =>
  isRecord(value) &&
  value.success === false &&
  typeof value.code === "string" &&
  typeof value.message === "string";

const isApiSuccess = <T>(value: unknown): value is { success: true; data: T } =>
  isRecord(value) && value.success === true && "data" in value;

const apiBaseUrl =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  "http://localhost:3001";

interface RequestOptions {
  authorization?: string;
}

async function request<T>(
  method: string,
  path: string,
  body: unknown,
  parseEnvelope: (json: unknown) => T,
  options?: RequestOptions,
): Promise<T> {
  let response: Response;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options?.authorization) {
    headers.authorization = options.authorization;
  }

  try {
    response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new AuthClientError(
      "network",
      error instanceof Error ? error.message : "Network error",
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new AuthClientError(
      response.ok ? "invalid_response" : "http",
      response.ok ? "Invalid JSON response" : "Request failed",
      { status: response.status },
    );
  }

  if (!response.ok) {
    if (isApiError(json)) {
      throw new AuthClientError("api", json.message, {
        status: response.status,
        code: json.code,
        details: json.details,
      });
    }
    throw new AuthClientError("http", "Request failed", {
      status: response.status,
      details: json,
    });
  }

  return parseEnvelope(json);
}

export async function register(input: SignupRequest): Promise<AuthSession> {
  return request("POST", "/api/v1/auth/register", input, (json) => {
    if (isApiSuccess<AuthSession>(json)) return json.data;
    if (isApiError(json))
      throw new AuthClientError("api", json.message, { code: json.code });
    throw new AuthClientError("invalid_response", "Unknown envelope");
  });
}

export async function login(input: LoginRequest): Promise<AuthSession> {
  return request("POST", "/api/v1/auth/login", input, (json) => {
    if (isApiSuccess<AuthSession>(json)) return json.data;
    if (isApiError(json))
      throw new AuthClientError("api", json.message, { code: json.code });
    throw new AuthClientError("invalid_response", "Unknown envelope");
  });
}

export async function refreshSession(refreshToken: string): Promise<SessionRefreshResponse> {
  return request("POST", "/api/v1/auth/refresh", { refreshToken }, (json) => {
    if (isApiSuccess<SessionRefreshResponse>(json)) return json.data;
    if (isApiError(json))
      throw new AuthClientError("api", json.message, { code: json.code });
    throw new AuthClientError("invalid_response", "Unknown envelope");
  });
}

export async function introspectSession(accessToken: string): Promise<IntrospectResponse> {
  try {
    return await request(
      "GET",
      "/api/v1/auth/introspect",
      null,
      (json) => {
        if (isApiSuccess<IntrospectResponse>(json)) return json.data;
        if (isApiError(json))
          throw new AuthClientError("api", json.message, { code: json.code });
        throw new AuthClientError("invalid_response", "Unknown envelope");
      },
      { authorization: `Bearer ${accessToken}` },
    );
  } catch (error) {
    if (error instanceof AuthClientError && error.status === 401) {
      return { valid: false };
    }
    throw error;
  }
}

export async function logoutSession(refreshToken: string): Promise<SessionLogoutResponse> {
  return request("POST", "/api/v1/auth/logout", { refreshToken }, (json) => {
    if (isApiSuccess<SessionLogoutResponse>(json)) return json.data;
    if (isApiError(json))
      throw new AuthClientError("api", json.message, { code: json.code });
    throw new AuthClientError("invalid_response", "Unknown envelope");
  });
}

import type { ApiError, AuthSession, LoginRequest, SignupRequest, SignupResponseData } from "@themixmatch/types";
import { UserRole } from "@themixmatch/types";

export type AuthClientErrorKind =
  | "network"
  | "http"
  | "api"
  | "invalid_response";

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

const isApiSuccess = (value: unknown): value is { success: true; data: unknown } =>
  isRecord(value) && value.success === true && "data" in value;

const isSignupData = (value: unknown): value is SignupResponseData => {
  if (!isRecord(value)) return false;
  if (typeof value.token !== "string") return false;
  if (!isRecord(value.user)) return false;
  if (!isRecord(value.session)) return false;
  return true;
};

const parseEnvelope = (value: unknown): SignupResponseData => {
  if (!isRecord(value)) {
    throw new AuthClientError("invalid_response", "Invalid response shape");
  }

  if (isApiSuccess(value)) {
    if (!isSignupData(value.data)) {
      throw new AuthClientError("invalid_response", "Invalid response payload");
    }
    return value.data;
  }

  if (isApiError(value)) {
    throw new AuthClientError("api", value.message, {
      code: value.code,
      details: value.details,
    });
  }

  throw new AuthClientError("invalid_response", "Unknown response envelope");
};

const apiBaseUrl =
  (globalThis as Record<string, unknown>).process &&
  typeof (globalThis as Record<string, unknown>).process === "object"
    ? ((globalThis as Record<string, unknown>).process as { env?: Record<string, string | undefined> }).env
        ?.EXPO_PUBLIC_API_BASE_URL
    : undefined;
const apiEndpoint = (path: string) =>
  `${(apiBaseUrl ?? "http://localhost:3001").replace(/\/$/, "")}${path}`;

const randomId = () =>
  `user_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

const sessionFromSignup = (data: SignupResponseData): AuthSession => data;

async function registerRemote(input: SignupRequest): Promise<AuthSession> {
  let response: Response;
  try {
    response = await fetch(apiEndpoint("/api/v1/auth/register"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
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

  return sessionFromSignup(parseEnvelope(json));
}

async function registerLocal(input: SignupRequest): Promise<AuthSession> {
  const userId = randomId();
  const now = new Date().toISOString();

  return {
    token: `local.${userId}.${Date.now()}`,
    user: {
      id: userId,
      name: input.email.split("@")[0]?.trim() || "mixmatch-user",
      email: input.email.toLowerCase(),
      role: input.role,
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      userId,
      role: input.role ?? UserRole.MUSIC_LOVER,
      onboardingCompleted: false,
      issuedAt: now,
    },
  };
}

async function loginRemote(input: LoginRequest): Promise<AuthSession> {
  let response: Response;
  try {
    response = await fetch(apiEndpoint("/api/v1/auth/login"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
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

  return sessionFromSignup(parseEnvelope(json));
}

async function loginLocal(input: LoginRequest): Promise<AuthSession> {
  const userId = randomId();
  const now = new Date().toISOString();

  return {
    token: `local.${userId}.${Date.now()}`,
    user: {
      id: userId,
      name: input.email.split("@")[0]?.trim() || "mixmatch-user",
      email: input.email.toLowerCase(),
      role: UserRole.MUSIC_LOVER,
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      userId,
      role: UserRole.MUSIC_LOVER,
      onboardingCompleted: false,
      issuedAt: now,
    },
  };
}

export async function register(input: SignupRequest): Promise<AuthSession> {
  if (apiBaseUrl) return registerRemote(input);
  return registerLocal(input);
}

export async function login(input: LoginRequest): Promise<AuthSession> {
  if (apiBaseUrl) return loginRemote(input);
  return loginLocal(input);
}

import type { ApiError, AuthSession, LoginRequest, SignupRequest, SignupResponseData, ProtectedSession, ValidateSessionRequest, SessionRefreshRequest, SessionRefreshResponse } from "@themixmatch/types";
import { UserRole } from "@themixmatch/types";

export type AuthClientErrorKind = "network" | "http" | "api" | "invalid_response";

export class AuthClientError extends Error {
  kind: AuthClientErrorKind;
  status?: number;
  code?: string;
  details?: unknown;

  constructor(kind: AuthClientErrorKind, message: string, options?: { status?: number; code?: string; details?: unknown }) {
    super(message);
    this.kind = kind;
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const isApiError = (value: unknown): value is ApiError =>
  isRecord(value) && value.success === false && typeof value.code === "string" && typeof value.message === "string";

const isApiSuccess = (value: unknown): value is { success: true; data: unknown } =>
  isRecord(value) && value.success === true && "data" in value;

const isSignupData = (value: unknown): value is SignupResponseData => {
  if (!isRecord(value)) return false;
  if (typeof value.token !== "string") return false;
  if (!isRecord(value.user)) return false;
  if (!isRecord(value.session)) return false;
  return true;
};

const isProtectedSession = (value: unknown): value is ProtectedSession => {
  if (!isRecord(value)) return false;
  if (typeof value.isValid !== "boolean") return false;
  if (typeof value.needsRefresh !== "boolean") return false;
  return true;
};

const isSessionRefreshResponse = (value: unknown): value is SessionRefreshResponse => {
  if (!isRecord(value)) return false;
  if (typeof value.accessToken !== "string") return false;
  if (typeof value.refreshToken !== "string") return false;
  if (typeof value.expiresAt !== "string") return false;
  return true;
};

const parseEnvelope = (value: unknown): SignupResponseData => {
  if (!isRecord(value)) throw new AuthClientError("invalid_response", "Invalid response shape");
  if (isApiSuccess(value)) {
    if (!isSignupData(value.data)) throw new AuthClientError("invalid_response", "Invalid response payload");
    return value.data;
  }
  if (isApiError(value)) throw new AuthClientError("api", value.message, { code: value.code, details: value.details });
  throw new AuthClientError("invalid_response", "Unknown response envelope");
};

const parseProtectedSessionEnvelope = (value: unknown): ProtectedSession => {
  if (!isRecord(value)) throw new AuthClientError("invalid_response", "Invalid response shape");
  if (isApiSuccess(value)) {
    if (!isProtectedSession(value.data)) throw new AuthClientError("invalid_response", "Invalid response payload");
    return value.data;
  }
  if (isApiError(value)) throw new AuthClientError("api", value.message, { code: value.code, details: value.details });
  throw new AuthClientError("invalid_response", "Unknown response envelope");
};

const parseSessionRefreshEnvelope = (value: unknown): SessionRefreshResponse => {
  if (!isRecord(value)) throw new AuthClientError("invalid_response", "Invalid response shape");
  if (isApiSuccess(value)) {
    if (!isSessionRefreshResponse(value.data)) throw new AuthClientError("invalid_response", "Invalid response payload");
    return value.data;
  }
  if (isApiError(value)) throw new AuthClientError("api", value.message, { code: value.code, details: value.details });
  throw new AuthClientError("invalid_response", "Unknown response envelope");
};

const apiBaseUrl =
  (globalThis as Record<string, unknown>).process &&
  typeof (globalThis as Record<string, unknown>).process === "object"
    ? ((globalThis as Record<string, unknown>).process as { env?: Record<string, string | undefined> }).env?.EXPO_PUBLIC_API_BASE_URL
    : undefined;

const apiEndpoint = (path: string) => `${(apiBaseUrl ?? "http://localhost:3001").replace(/\/$/, "")}${path}`;
const randomId = () => `user_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
const sessionFromSignup = (data: SignupResponseData): AuthSession => data;

async function remoteFetch<T>(url: string, body: unknown, parseData: (json: unknown) => T): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch (error) {
    throw new AuthClientError("network", error instanceof Error ? error.message : "Network error");
  }
  let json: unknown;
  try { json = await response.json(); } catch {
    throw new AuthClientError(response.ok ? "invalid_response" : "http", response.ok ? "Invalid JSON response" : "Request failed", { status: response.status });
  }
  if (!response.ok) {
    if (isApiError(json)) throw new AuthClientError("api", json.message, { status: response.status, code: json.code, details: json.details });
    throw new AuthClientError("http", "Request failed", { status: response.status, details: json });
  }
  return parseData(json);
}

async function registerRemote(input: SignupRequest): Promise<AuthSession> {
  return remoteFetch(apiEndpoint("/api/v1/auth/register"), input, (json) => sessionFromSignup(parseEnvelope(json)));
}

async function loginRemote(input: LoginRequest): Promise<AuthSession> {
  return remoteFetch(apiEndpoint("/api/v1/auth/login"), input, (json) => sessionFromSignup(parseEnvelope(json)));
}

// ---------------------------------------------------------------------------
// Protected session — remote (AUTH-061)
// ---------------------------------------------------------------------------

async function validateSessionRemote(input: ValidateSessionRequest): Promise<ProtectedSession> {
  return remoteFetch(apiEndpoint("/api/v1/auth/validate"), input, parseProtectedSessionEnvelope);
}

async function refreshSessionRemote(input: SessionRefreshRequest): Promise<SessionRefreshResponse> {
  return remoteFetch(apiEndpoint("/api/v1/auth/refresh"), input, parseSessionRefreshEnvelope);
}

// ---------------------------------------------------------------------------
// Local-only helpers (offline / no API base URL)
// ---------------------------------------------------------------------------

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
      updatedAt: now 
    },
    session: { 
      userId, 
      role: input.role ?? UserRole.MUSIC_LOVER, 
      onboardingCompleted: false, 
      issuedAt: now,
      wallet: {
        service: "stellar-service",
        status: "unlinked",
        networkPassphrase: "Test SDF Network ; September 2015",
        horizonUrl: "https://horizon-testnet.stellar.org",
        availableWallets: ["phantom", "freighter"],
      },
    },
  };
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
      wallet: {
        service: "stellar-service",
        status: "unlinked",
        networkPassphrase: "Test SDF Network ; September 2015",
        horizonUrl: "https://horizon-testnet.stellar.org",
        availableWallets: ["phantom", "freighter"],
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Protected session — local (AUTH-061)
// ---------------------------------------------------------------------------

/**
 * For local sessions, we treat them as always valid since they are ephemeral
 * and have no server-side validation. Protected session logic is a no-op.
 */
function validateSessionLocal(_input: ValidateSessionRequest): ProtectedSession {
  return {
    isValid: false,
    needsRefresh: false,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function register(input: SignupRequest): Promise<AuthSession> {
  return apiBaseUrl ? registerRemote(input) : registerLocal(input);
}

export async function login(input: LoginRequest): Promise<AuthSession> {
  return apiBaseUrl ? loginRemote(input) : loginLocal(input);
}

export async function validateSession(input: ValidateSessionRequest): Promise<ProtectedSession> {
  return apiBaseUrl ? validateSessionRemote(input) : validateSessionLocal(input);
}

export async function refreshSession(input: SessionRefreshRequest): Promise<SessionRefreshResponse> {
  if (!apiBaseUrl) {
    throw new AuthClientError("api", "Session refresh not available in local mode");
  }
  return refreshSessionRemote(input);
}
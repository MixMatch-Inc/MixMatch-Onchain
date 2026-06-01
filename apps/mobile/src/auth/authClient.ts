import type {
  ApiError,
  AuthSession,
  IntrospectResponse,
  LoginRequest,
  SessionLogoutResponse,
  SessionRefreshResponse,
  SignupRequest,
  SignupResponseData,
} from "@themixmatch/types";
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

const isSessionRefreshData = (value: unknown): value is SessionRefreshResponse => {
  if (!isRecord(value)) return false;
  return typeof value.accessToken === "string" && typeof value.refreshToken === "string" && typeof value.expiresAt === "string";
};

const isIntrospectData = (value: unknown): value is IntrospectResponse => {
  if (!isRecord(value)) return false;
  return typeof value.valid === "boolean";
};

const isLogoutData = (value: unknown): value is SessionLogoutResponse => {
  if (!isRecord(value)) return false;
  return typeof value.loggedOut === "boolean";
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

const apiBaseUrl =
  (globalThis as Record<string, unknown>).process &&
  typeof (globalThis as Record<string, unknown>).process === "object"
    ? ((globalThis as Record<string, unknown>).process as { env?: Record<string, string | undefined> }).env?.EXPO_PUBLIC_API_BASE_URL
    : undefined;
const apiEndpoint = (path: string) => `${(apiBaseUrl ?? "http://localhost:3001").replace(/\/$/, "")}${path}`;
const randomId = () => `user_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
const sessionFromSignup = (data: SignupResponseData): AuthSession => data;

interface RequestOptions {
  method?: string;
  authorization?: string;
}

async function remoteFetch<T>(
  url: string,
  body: unknown,
  parseData: (json: unknown) => T,
  options?: RequestOptions,
): Promise<T> {
  let response: Response;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options?.authorization) {
    headers.authorization = options.authorization;
  }

  try {
    response = await fetch(url, {
      method: options?.method ?? "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
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
// Local-only helpers (offline / no API base URL)
// ---------------------------------------------------------------------------

const defaultWallet = {
  service: "stellar-service" as const,
  status: "unlinked" as const,
  networkPassphrase: "Test SDF Network ; September 2015",
  horizonUrl: "https://horizon-testnet.stellar.org",
  availableWallets: ["phantom", "freighter"],
};

async function registerLocal(input: SignupRequest): Promise<AuthSession> {
  const userId = randomId();
  const now = new Date().toISOString();
  return {
    token: `local.${userId}.${Date.now()}`,
    refreshToken: `local.refresh.${userId}.${Date.now()}`,
    user: { id: userId, name: input.email.split("@")[0]?.trim() || "mixmatch-user", email: input.email.toLowerCase(), role: input.role, onboardingCompleted: false, createdAt: now, updatedAt: now },
    session: { userId, role: input.role ?? UserRole.MUSIC_LOVER, onboardingCompleted: false, issuedAt: now, wallet: defaultWallet },
  };
}

async function loginLocal(input: LoginRequest): Promise<AuthSession> {
  const userId = randomId();
  const now = new Date().toISOString();
  return {
    token: `local.${userId}.${Date.now()}`,
    refreshToken: `local.refresh.${userId}.${Date.now()}`,
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
      wallet: defaultWallet,
    },
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

export async function refreshSession(refreshToken: string): Promise<SessionRefreshResponse> {
  if (!apiBaseUrl) {
    return {
      accessToken: `local.${Date.now()}`,
      refreshToken: `local.refresh.${Date.now()}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  return remoteFetch(
    apiEndpoint("/api/v1/auth/refresh"),
    { refreshToken },
    (json) => {
      if (isApiSuccess(json) && isSessionRefreshData(json.data)) {
        return json.data;
      }
      throw new AuthClientError("invalid_response", "Invalid refresh payload");
    },
  );
}

export async function introspectSession(accessToken: string): Promise<IntrospectResponse> {
  if (!apiBaseUrl) {
    return accessToken.startsWith("local.") ? { valid: true } : { valid: false };
  }

  try {
    return await remoteFetch(
      apiEndpoint("/api/v1/auth/introspect"),
      null,
      (json) => {
        if (isApiSuccess(json) && isIntrospectData(json.data)) {
          return json.data;
        }
        throw new AuthClientError("invalid_response", "Invalid introspection payload");
      },
      { method: "GET", authorization: `Bearer ${accessToken}` },
    );
  } catch (error) {
    if (error instanceof AuthClientError && error.status === 401) {
      return { valid: false };
    }
    throw error;
  }
}

export async function logoutSession(refreshToken: string): Promise<SessionLogoutResponse> {
  if (!apiBaseUrl) {
    return { loggedOut: true };
  }

  return remoteFetch(
    apiEndpoint("/api/v1/auth/logout"),
    { refreshToken },
    (json) => {
      if (isApiSuccess(json) && isLogoutData(json.data)) {
        return json.data;
      }
      throw new AuthClientError("invalid_response", "Invalid logout payload");
    },
  );
}

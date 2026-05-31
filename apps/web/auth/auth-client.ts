import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
} from "@themixmatch/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001/api/v1";

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return response.json() as Promise<T>;
}

export async function signup(
  payload: SignupRequest,
): Promise<SignupResponse> {
  return postJson<SignupResponse>("/auth/register", payload);
}

export async function login(
  payload: LoginRequest,
): Promise<LoginResponse> {
  return postJson<LoginResponse>("/auth/login", payload);
}

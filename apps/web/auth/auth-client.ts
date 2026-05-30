import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
} from "@themixmatch/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export async function signup(
  payload: SignupRequest,
): Promise<SignupResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return response.json() as Promise<SignupResponse>;
}

export async function login(
  payload: LoginRequest,
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return response.json() as Promise<LoginResponse>;
}

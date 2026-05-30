import type {
  SignupRequest,
  SignupResponse,
} from "@themixmatch/types";

export async function signup(
  payload: SignupRequest,
): Promise<SignupResponse> {
  const response = await fetch(
    "/api/auth/signup",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      "Registration failed",
    );
  }

  return response.json();
}

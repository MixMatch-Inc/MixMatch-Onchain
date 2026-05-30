import {
  SignupRequest,
  SignupResponse,
  ApiResponse,
} from "@workspace/types/auth";

export async function signup(
  payload: SignupRequest,
): Promise<
  ApiResponse<SignupResponse>
> {
  const response =
    await fetch(
      "/api/auth/signup",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          payload,
        ),
      },
    );

  return response.json();
}

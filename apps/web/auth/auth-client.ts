export async function signup(
  payload: SignupRequest,
): Promise<
  ApiResponse<SignupResponse>
> {
  return api.post(
    "/auth/signup",
    payload,
  );
}
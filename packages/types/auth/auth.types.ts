export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SignupResponse {
  user: AuthUser;
  session: AuthSession;
}
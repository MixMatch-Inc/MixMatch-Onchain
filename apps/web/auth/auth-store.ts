interface AuthState {
  user: AuthUser | null;

  session:
    | AuthSession
    | null;

  setSession(
    session: AuthSession,
  ): void;

  clearSession(): void;
}
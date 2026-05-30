const ACCESS_TOKEN_KEY =
  "access_token";

const REFRESH_TOKEN_KEY =
  "refresh_token";

export const authStorage = {
  saveSession(
    session: AuthSession,
  ) {
    localStorage.setItem(
      ACCESS_TOKEN_KEY,
      session.accessToken,
    );

    localStorage.setItem(
      REFRESH_TOKEN_KEY,
      session.refreshToken,
    );
  },

  clearSession() {
    localStorage.removeItem(
      ACCESS_TOKEN_KEY,
    );

    localStorage.removeItem(
      REFRESH_TOKEN_KEY,
    );
  },
};
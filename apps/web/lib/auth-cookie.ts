const AUTH_COOKIE_NAME = 'mixmatch_auth_token';
const AUTH_COOKIE_BASE = `${AUTH_COOKIE_NAME}=`;

export const authCookieName = AUTH_COOKIE_NAME;

export const setAuthCookie = (token: string): void => {
  document.cookie = `${AUTH_COOKIE_BASE}${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
};

export const clearAuthCookie = (): void => {
  document.cookie = `${AUTH_COOKIE_BASE}; Path=/; Max-Age=0; SameSite=Lax`;
};

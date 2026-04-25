export interface AuthProvider {
  getToken(): Promise<string | null>;
  refreshToken?(): Promise<string | null>;
  onAuthError?(error: any): void;
}

export class TokenAuthProvider implements AuthProvider {
  constructor(
    private tokenProvider: () => Promise<string | null>,
    private refreshProvider?: () => Promise<string | null>
  ) {}

  async getToken(): Promise<string | null> {
    return await this.tokenProvider();
  }

  async refreshToken(): Promise<string | null> {
    return this.refreshProvider ? await this.refreshProvider() : null;
  }
}

export class AuthInjector {
  constructor(private authProvider: AuthProvider) {}

  async injectAuth(headers: Record<string, string>): Promise<Record<string, string>> {
    const token = await this.authProvider.getToken();
    
    if (token) {
      return {
        ...headers,
        'Authorization': `Bearer ${token}`
      };
    }
    
    return headers;
  }

  async handleAuthError(error: any): Promise<void> {
    if (this.authProvider.onAuthError) {
      await this.authProvider.onAuthError(error);
    }
  }
}

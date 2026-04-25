import { UserRole } from '@mixmatch/types';

export interface MockSession {
  userId: string;
  email: string;
  role: UserRole;
  token: string;
  onboardingCompleted: boolean;
}

/** Pre-built session fixtures for common test scenarios */
export const SESSION_FIXTURES = {
  dj: {
    userId: 'user_dj_001',
    email: 'dj.test@mixmatch.io',
    role: UserRole.DJ,
    token: 'mock-jwt-dj-001',
    onboardingCompleted: true,
  } satisfies MockSession,

  fan: {
    userId: 'user_fan_001',
    email: 'fan.test@mixmatch.io',
    role: UserRole.MUSIC_LOVER,
    token: 'mock-jwt-fan-001',
    onboardingCompleted: true,
  } satisfies MockSession,

  unauthenticated: null as MockSession | null,

  incompleteOnboarding: {
    userId: 'user_new_001',
    email: 'new.test@mixmatch.io',
    role: UserRole.MUSIC_LOVER,
    token: 'mock-jwt-new-001',
    onboardingCompleted: false,
  } satisfies MockSession,
} as const;

/** In-memory session store mock (replaces SecureStorage on mobile) */
export class MockSecureStorage {
  private store = new Map<string, string>();

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  /** Seed with a session fixture */
  async seedSession(session: MockSession): Promise<void> {
    await this.setItem('auth_token', session.token);
    await this.setItem('user_id', session.userId);
    await this.setItem('user_role', session.role);
  }
}

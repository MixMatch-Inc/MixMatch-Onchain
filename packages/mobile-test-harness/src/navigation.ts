/** Minimal navigation mock for testing navigation-dependent components in isolation */

export interface NavigationRoute {
  name: string;
  params?: Record<string, unknown>;
}

export class MockNavigation {
  private history: NavigationRoute[] = [];
  private current: NavigationRoute = { name: 'Home' };

  navigate(name: string, params?: Record<string, unknown>): void {
    this.history.push(this.current);
    this.current = { name, params };
  }

  goBack(): void {
    const prev = this.history.pop();
    if (prev) this.current = prev;
  }

  replace(name: string, params?: Record<string, unknown>): void {
    this.current = { name, params };
  }

  reset(routes: NavigationRoute[]): void {
    this.history = [];
    this.current = routes[routes.length - 1] ?? { name: 'Home' };
  }

  getCurrentRoute(): NavigationRoute {
    return this.current;
  }

  getHistory(): NavigationRoute[] {
    return [...this.history];
  }

  canGoBack(): boolean {
    return this.history.length > 0;
  }
}

/** Common route names used across the mobile app */
export const ROUTES = {
  HOME: 'Home',
  LOGIN: 'Login',
  REGISTER: 'Register',
  ONBOARDING: 'Onboarding',
  DASHBOARD: 'Dashboard',
  DISCOVERY: 'Discovery',
  JOURNEY_PLAYER: 'JourneyPlayer',
  PROFILE: 'Profile',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];

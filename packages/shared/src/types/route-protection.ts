export type RouteAccess =
  | { kind: 'public' }
  | { kind: 'authenticated' }
  | { kind: 'role'; role: string }
  | { kind: 'ownership'; paramId: string };

export interface RouteProtectionContract {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  access: RouteAccess;
  description?: string;
}

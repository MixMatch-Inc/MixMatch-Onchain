export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Record<string, unknown>) => string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterMs: number;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: Date }>;
  decrement(key: string): Promise<void>;
  reset(key: string): Promise<void>;
}

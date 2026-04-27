/**
 * Risk assessment result returned by any IRiskCheckService implementation.
 */
export interface RiskCheckResult {
  /** Whether the request should be allowed to proceed */
  allowed: boolean;
  /** Risk score in [0, 1] — 0 = no risk, 1 = maximum risk */
  score: number;
  /** Human-readable reason when allowed=false */
  reason?: string;
  /** Provider-specific metadata (e.g. captcha token, challenge ID) */
  providerMeta?: Record<string, unknown>;
}

export type RiskCheckContext = 'signup' | 'login' | 'reset' | 'verify';

/**
 * Abstraction for captcha / risk-assessment providers.
 * Implement this interface to plug in reCAPTCHA, hCaptcha, Arkose, etc.
 */
export interface IRiskCheckService {
  /**
   * Assess the risk of an incoming request.
   *
   * @param context  - Which auth flow is being protected
   * @param token    - Client-supplied captcha/challenge token (may be undefined in no-op)
   * @param ip       - Caller IP address
   * @param userAgent - Caller user-agent string
   */
  assess(
    context: RiskCheckContext,
    token: string | undefined,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<RiskCheckResult>;
}

/**
 * No-op adapter — always allows requests.
 * Used in local development and test environments where no captcha vendor is configured.
 */
export class NoOpRiskCheckService implements IRiskCheckService {
  async assess(
    _context: RiskCheckContext,
    _token: string | undefined,
    _ip: string | undefined,
    _userAgent: string | undefined,
  ): Promise<RiskCheckResult> {
    return { allowed: true, score: 0 };
  }
}

/** Singleton no-op instance — swap this out in production via DI */
export const noOpRiskCheckService = new NoOpRiskCheckService();

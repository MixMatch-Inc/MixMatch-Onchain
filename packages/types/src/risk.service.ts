import type { AuthRiskSignal, AuthRiskReason, AuthRiskLevel } from '@stella/types/auth';

export interface RiskInput {
  email:         string;
  ip:            string | null;
  userAgent:     string | null;
  failureCount:  number;
  isNewDevice?:  boolean;
}

export function evaluateRisk(input: RiskInput): AuthRiskSignal {
  const reasons: AuthRiskReason[] = [];

  if (input.failureCount >= 3)     reasons.push('high_failure_rate');
  if (input.isNewDevice)            reasons.push('new_device');
  if (!input.ip)                    reasons.push('suspicious_timing');

  const level = computeLevel(input.failureCount, reasons);

  return {
    level,
    reasons,
    requiresVerification: level === 'high' || level === 'critical',
  };
}

function computeLevel(failureCount: number, reasons: AuthRiskReason[]): AuthRiskLevel {
  if (failureCount >= 10 || reasons.includes('leaked_credential')) return 'critical';
  if (failureCount >= 5  || reasons.length >= 2)                    return 'high';
  if (failureCount >= 2  || reasons.length >= 1)                    return 'medium';
  return 'low';
}

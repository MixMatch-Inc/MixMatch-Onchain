'use client';

import type {
  AuthThrottleState,
  AuthCooldownState,
  AuthRiskSignal,
  AuthErrorCode,
} from '@stella/types/auth';

interface AuthNoticeProps {
  error:    AuthErrorCode | null;
  message:  string | null;
  throttle: AuthThrottleState | null;
  cooldown: AuthCooldownState | null;
  risk:     AuthRiskSignal | null;
}

export function AuthNotice({ error, message, throttle, cooldown, risk }: AuthNoticeProps) {
  // Priority: cooldown > throttle > risk > generic error
  if (cooldown?.active) {
    const until = cooldown.expiresAt
      ? new Date(cooldown.expiresAt).toLocaleTimeString()
      : 'a moment';
    return (
      <Notice variant="error">
        Account temporarily locked after too many failed attempts.{' '}
        Try again after <strong>{until}</strong>.
      </Notice>
    );
  }

  if (throttle?.limited) {
    const until = throttle.resetsAt
      ? new Date(throttle.resetsAt).toLocaleTimeString()
      : 'a moment';
    return (
      <Notice variant="warning">
        Too many requests. Please wait until <strong>{until}</strong> before trying again.
      </Notice>
    );
  }

  if (risk?.requiresVerification) {
    return (
      <Notice variant="warning">
        Unusual activity detected. Check your email for a verification link before continuing.
      </Notice>
    );
  }

  if (throttle && !throttle.limited && throttle.attemptsRemaining !== null &&
      throttle.attemptsRemaining <= 2) {
    return (
      <Notice variant="warning">
        {throttle.attemptsRemaining} attempt{throttle.attemptsRemaining === 1 ? '' : 's'} remaining
        before a temporary lockout.
      </Notice>
    );
  }

  if (error === 'EMAIL_NOT_CONFIRMED') {
    return (
      <Notice variant="info">
        Please check your email and confirm your account before signing in.
      </Notice>
    );
  }

  if (message) {
    const variant = error ? 'error' : 'success';
    return <Notice variant={variant}>{message}</Notice>;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Internal Notice primitive
// ---------------------------------------------------------------------------

type NoticeVariant = 'error' | 'warning' | 'info' | 'success';

const VARIANT_CLASSES: Record<NoticeVariant, string> = {
  error:   'bg-red-50 border border-red-300 text-red-800',
  warning: 'bg-yellow-50 border border-yellow-300 text-yellow-800',
  info:    'bg-blue-50 border border-blue-300 text-blue-800',
  success: 'bg-green-50 border border-green-300 text-green-800',
};

function Notice({
  variant,
  children,
}: {
  variant: NoticeVariant;
  children: React.ReactNode;
}) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-md px-4 py-3 text-sm ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </div>
  );
}

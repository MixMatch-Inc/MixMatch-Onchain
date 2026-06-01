import type { AuthFailureEnvelope, ThrottleNotice, SessionRiskNotice } from "@themixmatch/types";
import { AuthClientError } from "./auth-client";

export interface AuthNotices {
  throttleNotice: ThrottleNotice | null;
  riskNotice: SessionRiskNotice | null;
  /** Human-readable message to display in the UI. */
  displayMessage: string | null;
}

const EMPTY_NOTICES: AuthNotices = {
  throttleNotice: null,
  riskNotice: null,
  displayMessage: null,
};

function isAuthFailureEnvelope(value: unknown): value is AuthFailureEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).success === false &&
    typeof (value as Record<string, unknown>).code === "string"
  );
}

/**
 * Extracts typed throttle and session-risk notices from an auth error.
 *
 * Usage:
 *   const notices = extractAuthNotices(caught);
 *   if (notices.throttleNotice?.throttled) showRetryCountdown(notices.throttleNotice.retryAfter);
 */
export function extractAuthNotices(error: unknown): AuthNotices {
  if (!(error instanceof AuthClientError)) return EMPTY_NOTICES;

  const details = error.details;

  if (!isAuthFailureEnvelope(details)) {
    if (error.code === "AUTH_RATE_LIMITED" || error.status === 429) {
      return {
        throttleNotice: { throttled: true },
        riskNotice: null,
        displayMessage: error.message,
      };
    }
    return { ...EMPTY_NOTICES, displayMessage: error.message };
  }

  const envelope = details;
  let displayMessage = envelope.message;

  if (envelope.throttle?.throttled && typeof envelope.throttle.retryAfter === "number") {
    const mins = Math.ceil(envelope.throttle.retryAfter / 60);
    displayMessage = `Too many attempts — try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
  }

  return {
    throttleNotice: envelope.throttle ?? null,
    riskNotice: envelope.risk ?? null,
    displayMessage,
  };
}

/**
 * Formats the throttle notice into a user-facing string.
 * Returns null when there is no active throttle.
 */
export function formatThrottleMessage(notice: ThrottleNotice | null): string | null {
  if (!notice?.throttled) return null;
  if (typeof notice.retryAfter === "number") {
    const mins = Math.ceil(notice.retryAfter / 60);
    return `Account temporarily locked — try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
  }
  return "Too many failed attempts — please wait before trying again.";
}

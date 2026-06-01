import { describe, it, expect } from "vitest";
import { extractAuthNotices, formatThrottleMessage } from "./use-auth-notices";
import { AuthClientError } from "./auth-client";

function makeApiError(code: string, message: string, details?: unknown, status = 401): AuthClientError {
  return new AuthClientError("api", message, { code, status, details });
}

describe("extractAuthNotices — throttle paths", () => {
  it("returns empty notices for non-AuthClientError", () => {
    const notices = extractAuthNotices(new Error("generic"));
    expect(notices.throttleNotice).toBeNull();
    expect(notices.riskNotice).toBeNull();
    expect(notices.displayMessage).toBeNull();
  });

  it("returns throttled notice for AUTH_RATE_LIMITED code without envelope", () => {
    const err = makeApiError("AUTH_RATE_LIMITED", "Too many requests", undefined, 429);
    const notices = extractAuthNotices(err);
    expect(notices.throttleNotice?.throttled).toBe(true);
    expect(notices.displayMessage).toBe("Too many requests");
  });

  it("extracts ThrottleNotice from AuthFailureEnvelope in error details", () => {
    const details = {
      success: false as const,
      code: "AUTH_RATE_LIMITED",
      message: "Too many attempts",
      throttle: { throttled: true, retryAfter: 600, attemptsRemaining: 0 },
    };
    const err = makeApiError("AUTH_RATE_LIMITED", "Too many attempts", details, 429);
    const notices = extractAuthNotices(err);
    expect(notices.throttleNotice?.throttled).toBe(true);
    expect(notices.throttleNotice?.retryAfter).toBe(600);
    expect(notices.throttleNotice?.attemptsRemaining).toBe(0);
  });

  it("builds human-readable retry message from retryAfter seconds", () => {
    const details = {
      success: false as const,
      code: "AUTH_RATE_LIMITED",
      message: "Too many attempts",
      throttle: { throttled: true, retryAfter: 300, attemptsRemaining: 0 },
    };
    const err = makeApiError("AUTH_RATE_LIMITED", "Too many attempts", details, 429);
    const notices = extractAuthNotices(err);
    expect(notices.displayMessage).toContain("5 minute");
  });

  it("extracts SessionRiskNotice from AuthFailureEnvelope", () => {
    const details = {
      success: false as const,
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Invalid credentials",
      risk: { type: "multiple_failures" as const, message: "Multiple login failures detected", action: "re_authenticate" as const },
    };
    const err = makeApiError("AUTH_INVALID_CREDENTIALS", "Invalid credentials", details);
    const notices = extractAuthNotices(err);
    expect(notices.riskNotice?.type).toBe("multiple_failures");
    expect(notices.riskNotice?.action).toBe("re_authenticate");
  });

  it("returns plain message for regular auth errors without envelope", () => {
    const err = makeApiError("AUTH_INVALID_CREDENTIALS", "Invalid email or password");
    const notices = extractAuthNotices(err);
    expect(notices.throttleNotice).toBeNull();
    expect(notices.displayMessage).toBe("Invalid email or password");
  });
});

describe("formatThrottleMessage", () => {
  it("returns null when notice is null", () => {
    expect(formatThrottleMessage(null)).toBeNull();
  });

  it("returns null when not throttled", () => {
    expect(formatThrottleMessage({ throttled: false })).toBeNull();
  });

  it("formats retryAfter as minutes", () => {
    const msg = formatThrottleMessage({ throttled: true, retryAfter: 900 });
    expect(msg).toContain("15 minute");
  });

  it("returns generic message when retryAfter is absent", () => {
    const msg = formatThrottleMessage({ throttled: true });
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe("string");
  });
});

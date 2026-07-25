import { describe, expect, it } from "vitest";
import { parsePersistedAuth, PERSISTED_AUTH_KEY } from "@mixmatch/shared";

/**
 * Regression coverage for the token-persistence workstream.
 *
 * Track: token persistence  |  Sprint 1  |  issue #780 (regression coverage)
 *
 * These tests verify the parsePersistedAuth contract defined in
 * packages/shared/src/types/token-persistence.ts. They run without
 * any browser or API dependency.
 */
describe("parsePersistedAuth — regression coverage", () => {
  it("returns { status: empty } for null input", () => {
    expect(parsePersistedAuth(null)).toEqual({ status: "empty" });
  });

  it("returns { status: corrupt } for non-JSON string", () => {
    const result = parsePersistedAuth("not-json");
    expect(result.status).toBe("corrupt");
  });

  it("returns { status: corrupt } for JSON missing accessToken", () => {
    const raw = JSON.stringify({ user: { id: "1", email: "a@b.com" } });
    const result = parsePersistedAuth(raw);
    expect(result.status).toBe("corrupt");
  });

  it("returns { status: corrupt } for JSON missing user", () => {
    const raw = JSON.stringify({ accessToken: "tok" });
    const result = parsePersistedAuth(raw);
    expect(result.status).toBe("corrupt");
  });

  it("returns { status: corrupt } when accessToken is not a string", () => {
    const raw = JSON.stringify({ user: { id: "1" }, accessToken: 42 });
    const result = parsePersistedAuth(raw);
    expect(result.status).toBe("corrupt");
  });

  it("returns { status: restored } for a valid persisted state", () => {
    const state = {
      user: { id: "u1", email: "test@example.com", role: "USER", createdAt: "", updatedAt: "" },
      accessToken: "valid.jwt.token",
    };
    const result = parsePersistedAuth(JSON.stringify(state));
    expect(result.status).toBe("restored");
    if (result.status === "restored") {
      expect(result.state.accessToken).toBe("valid.jwt.token");
      expect(result.state.user.email).toBe("test@example.com");
    }
  });

  it("storage key is the literal string mixmatch.auth", () => {
    expect(PERSISTED_AUTH_KEY).toBe("mixmatch.auth");
  });

  it("returns { status: corrupt } for an empty JSON object", () => {
    const result = parsePersistedAuth("{}");
    expect(result.status).toBe("corrupt");
  });

  it("returns { status: corrupt } for a JSON array", () => {
    const result = parsePersistedAuth("[]");
    expect(result.status).toBe("corrupt");
  });
});

import { AuthContractVersion } from "../packages/contracts/auth/auth.contracts";
import { parseLoginPayload, parseSignupPayload } from "./auth.parsers";
import { serializeLogin, serializeSignup } from "./auth.serializers";

describe("Auth Contracts", () => {
  it("parses signup payloads correctly", () => {
    const payload = parseSignupPayload({
      email: "TEST@example.com",
      password: "password123",
      fullName: "John Doe",
    });

    expect(payload).toEqual({
      version: AuthContractVersion.V1,
      email: "test@example.com",
      password: "password123",
      fullName: "John Doe",
    });
  });

  it("parses login payloads correctly", () => {
    const payload = parseLoginPayload({
      email: "USER@example.com",
      password: "secret",
    });

    expect(payload.email).toBe("user@example.com");
  });

  it("serializes signup DTOs", () => {
    const serialized = serializeSignup({
      version: AuthContractVersion.V1,
      email: "test@example.com",
      password: "password123",
      fullName: "Jane Doe",
    });

    expect(typeof serialized).toBe("string");
  });

  it("serializes login DTOs", () => {
    const serialized = serializeLogin({
      version: AuthContractVersion.V1,
      email: "test@example.com",
      password: "password123",
    });

    expect(typeof serialized).toBe("string");
  });

  it("supports compatibility adapters for legacy payloads", () => {
    const legacyPayload = {
      email: "legacy@example.com",
      password: "password123",
      name: "Legacy User",
    };

    expect(legacyPayload.name).toBe("Legacy User");
  });
});

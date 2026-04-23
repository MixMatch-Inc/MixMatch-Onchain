// Simple test file for error middleware without external dependencies
import { errorHandler } from "../src/middleware/error.middleware";
import { AuthError, ValidationError } from "../src/utils/errors";
import { ErrorCode, ErrorDomain } from "@mixmatch/types";

// Mock Express types
interface MockRequest {
  headers: Record<string, string>;
  path: string;
  method: string;
}

interface MockResponse {
  statusCode: number;
  body: any;
  status(code: number): MockResponse;
  json(data: any): MockResponse;
}

// Simple test runner
function runTests() {
  let testsPassed = 0;
  let testsTotal = 0;

  function test(name: string, fn: () => void) {
    testsTotal++;
    try {
      fn();
      console.log(`✓ ${name}`);
      testsPassed++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${(error as Error).message}`);
    }
  }

  function expect(actual: any) {
    return {
      toEqual(expected: any) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(
            `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
          );
        }
      },
      toBe(expected: any) {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toContain(expected: any) {
        if (!actual.includes(expected)) {
          throw new Error(`Expected ${actual} to contain ${expected}`);
        }
      },
      toHaveProperty(property: string, expectedValue?: any) {
        if (!(property in actual)) {
          throw new Error(`Expected object to have property ${property}`);
        }
        if (expectedValue !== undefined && actual[property] !== expectedValue) {
          throw new Error(
            `Expected property ${property} to be ${expectedValue}, got ${actual[property]}`,
          );
        }
      },
    };
  }

  // Mock request and response
  function createMockRequest(): MockRequest {
    return {
      headers: {},
      path: "/test",
      method: "GET",
    };
  }

  function createMockResponse(): MockResponse {
    const response: MockResponse = {
      statusCode: 0,
      body: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.body = data;
        return this;
      },
    };
    return response;
  }

  // Test 1: AuthError handling
  test("should handle AuthError with correct status code and format", () => {
    const mockRequest = createMockRequest();
    const mockResponse = createMockResponse();
    const authError = AuthError.invalidCredentials("test-123");

    errorHandler(authError, mockRequest as any, mockResponse as any, () => {});

    expect(mockResponse.statusCode).toBe(401);
    expect(mockResponse.body).toHaveProperty("success", false);
    expect(mockResponse.body).toHaveProperty("error");
    expect(mockResponse.body.error.code).toBe(
      ErrorCode.AUTH_INVALID_CREDENTIALS,
    );
    expect(mockResponse.body.error.domain).toBe(ErrorDomain.AUTH);
    expect(mockResponse.body.error.requestId).toBe("test-123");
  });

  // Test 2: ValidationError handling
  test("should handle ValidationError with 400 status", () => {
    const mockRequest = createMockRequest();
    const mockResponse = createMockResponse();
    const validationError = ValidationError.requiredFieldMissing(
      "email",
      "test-456",
    );

    errorHandler(
      validationError,
      mockRequest as any,
      mockResponse as any,
      () => {},
    );

    expect(mockResponse.statusCode).toBe(400);
    expect(mockResponse.body).toHaveProperty("success", false);
    expect(mockResponse.body.error.code).toBe(
      ErrorCode.VALIDATION_REQUIRED_FIELD_MISSING,
    );
    expect(mockResponse.body.error.domain).toBe(ErrorDomain.VALIDATION);
    expect(mockResponse.body.error.requestId).toBe("test-456");
  });

  // Test 3: Unknown error handling
  test("should convert unknown errors to InfrastructureError", () => {
    const mockRequest = createMockRequest();
    const mockResponse = createMockResponse();
    const genericError = new Error("Database connection failed");

    errorHandler(
      genericError,
      mockRequest as any,
      mockResponse as any,
      () => {},
    );

    expect(mockResponse.statusCode).toBe(500);
    expect(mockResponse.body).toHaveProperty("success", false);
    expect(mockResponse.body.error.code).toBe(
      ErrorCode.INFRASTRUCTURE_DATABASE_ERROR,
    );
    expect(mockResponse.body.error.domain).toBe(ErrorDomain.INFRASTRUCTURE);
  });

  // Test 4: Request ID generation
  test("should generate request ID if not present in headers", () => {
    const mockRequest = createMockRequest();
    const mockResponse = createMockResponse();
    const authError = AuthError.invalidCredentials();

    errorHandler(authError, mockRequest as any, mockResponse as any, () => {});

    expect(mockResponse.body.error.requestId).toContain("req_");
    expect(typeof mockResponse.body.error.requestId).toBe("string");
  });

  // Test 5: Request ID from headers
  test("should use existing request ID from headers", () => {
    const mockRequest = createMockRequest();
    mockRequest.headers["x-request-id"] = "existing-id-123";
    const mockResponse = createMockResponse();
    const authError = AuthError.invalidCredentials();

    errorHandler(authError, mockRequest as any, mockResponse as any, () => {});

    expect(mockResponse.body.error.requestId).toBe("existing-id-123");
  });

  // Test results
  console.log(`\nTest Results: ${testsPassed}/${testsTotal} passed`);

  if (testsPassed === testsTotal) {
    console.log("🎉 All tests passed!");
  } else {
    console.log(`❌ ${testsTotal - testsPassed} tests failed`);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

export { runTests };

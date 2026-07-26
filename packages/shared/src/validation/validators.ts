import { type ZodSchema, type ZodError } from 'zod';

interface ValidatedOk<T> {
  success: true;
  data: T;
}

interface ValidatedFail {
  success: false;
  error: string;
  fieldErrors?: Record<string, string[]>;
}

type Validated<T> = ValidatedOk<T> | ValidatedFail;

export function validate<T>(schema: ZodSchema<T>, input: unknown): Validated<T> {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const zodError = result.error as ZodError;
  const firstIssue = zodError.issues[0];
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of zodError.issues) {
    const path = issue.path.join('.') || '_root';
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(issue.message);
  }

  return {
    success: false,
    error: firstIssue?.message ?? 'Validation failed',
    fieldErrors,
  };
}

export function validateOrThrow<T>(schema: ZodSchema<T>, input: unknown): T {
  const result = validate(schema, input);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export function safeParse<T>(schema: ZodSchema<T>, input: unknown): T | null {
  const result = validate(schema, input);
  return result.success ? result.data : null;
}

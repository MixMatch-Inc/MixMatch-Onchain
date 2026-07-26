import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validate, validateOrThrow, safeParse } from '../validation/validators.js';

const testSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.number().min(0, 'Age must be non-negative'),
});

describe('validate', () => {
  it('returns success with data for valid input', () => {
    const result = validate(testSchema, { name: 'Alice', age: 30 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Alice');
      expect(result.data.age).toBe(30);
    }
  });

  it('returns failure with error message for invalid input', () => {
    const result = validate(testSchema, { name: '', age: -1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
      expect(result.fieldErrors).toBeDefined();
    }
  });

  it('returns field-level errors for invalid input', () => {
    const result = validate(testSchema, { name: '', age: -1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.name).toBeDefined();
      expect(result.fieldErrors?.age).toBeDefined();
    }
  });

  it('returns a generic error for completely invalid types', () => {
    const result = validate(testSchema, null);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});

describe('validateOrThrow', () => {
  it('returns data for valid input', () => {
    const data = validateOrThrow(testSchema, { name: 'Bob', age: 25 });

    expect(data.name).toBe('Bob');
    expect(data.age).toBe(25);
  });

  it('throws for invalid input', () => {
    expect(() => validateOrThrow(testSchema, { name: '', age: 25 })).toThrow();
  });
});

describe('safeParse', () => {
  it('returns data for valid input', () => {
    const data = safeParse(testSchema, { name: 'Charlie', age: 35 });

    expect(data).not.toBeNull();
    expect(data?.name).toBe('Charlie');
  });

  it('returns null for invalid input', () => {
    const data = safeParse(testSchema, { name: '', age: 35 });

    expect(data).toBeNull();
  });
});

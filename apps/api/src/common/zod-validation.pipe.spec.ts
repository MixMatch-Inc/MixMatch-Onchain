import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    age: z.number().int().positive('Age must be a positive integer'),
  });

  const pipe = new ZodValidationPipe(schema);

  it('passes through valid data and returns the parsed value', () => {
    const result = pipe.transform({ name: 'Alice', age: 30 });
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('throws BadRequestException for invalid data', () => {
    expect(() => pipe.transform({ name: '', age: 30 })).toThrow(BadRequestException);
  });

  it('includes the first Zod issue message in the exception', () => {
    expect(() => pipe.transform({ name: '', age: 30 })).toThrow('Name is required');
  });

  it('throws BadRequestException for missing required fields', () => {
    expect(() => pipe.transform({ age: 30 })).toThrow(BadRequestException);
  });

  it('throws BadRequestException for wrong types', () => {
    expect(() => pipe.transform({ name: 'Alice', age: 'not-a-number' })).toThrow(BadRequestException);
  });

  it('throws BadRequestException for extra input that violates refinements', () => {
    expect(() => pipe.transform({ name: 'Bob', age: -5 })).toThrow('Age must be a positive integer');
  });

  it('returns a BadRequestException with a fallback message when issues array is empty', () => {
    // Construct a schema that succeeds on the underlying safeParse but we
    // can simulate the empty-issues edge case by using a passthrough schema
    // that always fails with no issues (impossible via normal Zod, so we
    // verify the pipe itself handles an unusual schema gracefully).
    const alwaysFailSchema = {
      safeParse: () => ({
        success: false,
        error: { issues: [] },
      }),
    } as unknown as typeof schema;
    const emptyPipe = new ZodValidationPipe(alwaysFailSchema);
    expect(() => emptyPipe.transform({})).toThrow('Invalid request body');
  });
});

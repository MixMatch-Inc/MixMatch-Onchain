import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({ email: z.string().email(), age: z.number().int().min(0) });
  const pipe = new ZodValidationPipe(schema);

  it('returns parsed value when input is valid', () => {
    const input = { email: 'test@example.com', age: 25 };
    expect(pipe.transform(input)).toEqual(input);
  });

  it('coerces compatible types (e.g. string → number) if schema allows it', () => {
    const coercingSchema = z.object({ count: z.coerce.number() });
    const coercingPipe = new ZodValidationPipe(coercingSchema);
    expect(coercingPipe.transform({ count: '3' })).toEqual({ count: 3 });
  });

  it('throws BadRequestException for invalid input', () => {
    expect(() => pipe.transform({ email: 'not-an-email', age: 25 })).toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when required field is missing', () => {
    expect(() => pipe.transform({ age: 25 })).toThrow(BadRequestException);
  });

  it('includes the first Zod issue message in the exception', () => {
    try {
      pipe.transform({ email: 'bad', age: -1 });
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).message).toBeTruthy();
    }
  });

  it('throws BadRequestException for null input', () => {
    expect(() => pipe.transform(null)).toThrow(BadRequestException);
  });

  it('throws BadRequestException for a primitive string input', () => {
    expect(() => pipe.transform('plain string')).toThrow(BadRequestException);
  });
});

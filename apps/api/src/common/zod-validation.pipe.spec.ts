import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  it('returns parsed data when the schema matches', () => {
    const pipe = new ZodValidationPipe(z.object({ name: z.string() }));

    expect(pipe.transform({ name: 'MixMatch' })).toEqual({ name: 'MixMatch' });
  });

  it('throws a BadRequestException when parsing fails', () => {
    const pipe = new ZodValidationPipe(z.object({ name: z.string() }));

    expect(() => pipe.transform({ name: 123 })).toThrow(BadRequestException);
  });
});

import { BadRequestException } from '@nestjs/common';
import { parseHistoryQuery } from './payments.validators';

describe('parseHistoryQuery', () => {
  it('defaults page to 1 and limit to 20', () => {
    expect(parseHistoryQuery({})).toEqual({ page: 1, limit: 20 });
  });

  it('parses provided page and limit', () => {
    expect(parseHistoryQuery({ page: '3', limit: '5' })).toEqual({
      page: 3,
      limit: 5,
    });
  });

  it('caps limit at 100', () => {
    expect(parseHistoryQuery({ limit: '500' })).toEqual({
      page: 1,
      limit: 100,
    });
  });

  it('throws for a non-integer page', () => {
    expect(() => parseHistoryQuery({ page: 'abc' })).toThrow(
      BadRequestException,
    );
  });

  it('throws for a page less than 1', () => {
    expect(() => parseHistoryQuery({ page: '0' })).toThrow(BadRequestException);
  });

  it('throws for a negative limit', () => {
    expect(() => parseHistoryQuery({ limit: '-5' })).toThrow(
      BadRequestException,
    );
  });
});

import { BadRequestException } from '@nestjs/common';

export interface HistoryQuery {
  page: number;
  limit: number;
}

const MAX_HISTORY_LIMIT = 100;
const DEFAULT_HISTORY_LIMIT = 20;

export function parseHistoryQuery(
  query: Record<string, unknown>,
): HistoryQuery {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(
    parsePositiveInt(query.limit, DEFAULT_HISTORY_LIMIT),
    MAX_HISTORY_LIMIT,
  );
  return { page, limit };
}

function parsePositiveInt(raw: unknown, fallback: number): number {
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException('page and limit must be positive integers');
  }
  return parsed;
}

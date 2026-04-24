import { Types } from 'mongoose';

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export interface CursorData {
  field: string;
  value: string | number | Date | Types.ObjectId;
  direction: SortDirection;
  id?: string; // For tie-breaking
}

export interface PaginationOptions {
  limit: number;
  cursor?: string;
  direction?: SortDirection;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
  totalCount?: number; // Optional, for small datasets
}

export class PaginationError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'PaginationError';
    this.code = code;
  }
}

export const encodeCursor = (data: CursorData): string => {
  try {
    const payload = {
      f: data.field,
      v: data.value instanceof Types.ObjectId ? data.value.toString() : data.value,
      d: data.direction,
      i: data.id,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  } catch (error) {
    throw new PaginationError('Failed to encode cursor', 'ENCODE_FAILED');
  }
};

export const decodeCursor = (cursor: string): CursorData => {
  try {
    const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    return {
      field: payload.f,
      value: payload.v,
      direction: payload.d,
      id: payload.i,
    };
  } catch (error) {
    throw new PaginationError('Invalid cursor format', 'INVALID_CURSOR');
  }
};

export const validateCursor = (cursor?: string): CursorData | null => {
  if (!cursor) return null;
  try {
    return decodeCursor(cursor);
  } catch (error) {
    if (error instanceof PaginationError) {
      throw error;
    }
    throw new PaginationError('Cursor validation failed', 'VALIDATION_FAILED');
  }
};

export const buildPaginationQuery = (
  options: PaginationOptions,
  defaultSortField: string = '_id',
  defaultDirection: SortDirection = SortDirection.DESC
) => {
  const { limit, cursor, direction = defaultDirection } = options;
  const sortField = defaultSortField;
  const sortDirection = direction;

  let query: any = {};
  let sort: any = { [sortField]: sortDirection === SortDirection.DESC ? -1 : 1 };

  if (cursor) {
    const cursorData = validateCursor(cursor);
    if (cursorData) {
      const operator = sortDirection === SortDirection.DESC ? '$lt' : '$gt';
      query = {
        [cursorData.field]: { [operator]: cursorData.value }
      };

      // Add secondary sort for tie-breaking
      if (cursorData.id) {
        query._id = sortDirection === SortDirection.DESC ? { $lt: cursorData.id } : { $gt: cursorData.id };
      }
    }
  }

  return { query, sort, limit: limit + 1 }; // +1 to check if there's next page
};

export const createPaginatedResponse = <T>(
  items: T[],
  options: PaginationOptions,
  getCursorData: (item: T) => CursorData,
  totalCount?: number
): PaginatedResponse<T> => {
  const { limit } = options;
  const hasNextPage = items.length > limit;
  const data = hasNextPage ? items.slice(0, limit) : items;

  let nextCursor: string | undefined;
  let previousCursor: string | undefined;

  if (hasNextPage && data.length > 0) {
    nextCursor = encodeCursor(getCursorData(data[data.length - 1]));
  }

  // For previous cursor, we'd need to track the first item of the current page
  // This is more complex and might require additional logic in the calling code

  return {
    data,
    hasNextPage,
    hasPreviousPage: !!options.cursor, // Simplified: if we have a cursor, we can go back
    nextCursor,
    previousCursor,
    totalCount,
  };
};
import { PaginatedResponse, PaginationOptions, SortDirection } from '../../../api/src/utils/pagination';

export interface PaginationQuery {
  limit?: number;
  cursor?: string;
  direction?: SortDirection;
}

export const buildPaginationQueryString = (options: PaginationOptions): string => {
  const params = new URLSearchParams();
  params.set('limit', options.limit.toString());
  if (options.cursor) {
    params.set('cursor', options.cursor);
  }
  if (options.direction) {
    params.set('direction', options.direction);
  }
  return params.toString();
};

export const parsePaginationResponse = <T>(response: PaginatedResponse<T>) => {
  return {
    ...response,
    // Client-side helpers
    loadNextPage: response.hasNextPage && response.nextCursor ? () => ({
      limit: 20, // Default limit
      cursor: response.nextCursor,
      direction: SortDirection.DESC,
    }) : null,
    loadPreviousPage: response.hasPreviousPage && response.previousCursor ? () => ({
      limit: 20,
      cursor: response.previousCursor,
      direction: SortDirection.ASC, // Reverse direction for previous
    }) : null,
  };
};
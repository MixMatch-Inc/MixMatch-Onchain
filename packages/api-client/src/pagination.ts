import { PaginationParams, PaginatedResponse } from './types';

export class PaginationHelper {
  static buildQueryParams(params: PaginationParams): Record<string, string> {
    const queryParams: Record<string, string> = {};
    
    if (params.page !== undefined) {
      queryParams.page = params.page.toString();
    }
    
    if (params.pageSize !== undefined) {
      queryParams.pageSize = params.pageSize.toString();
    }
    
    if (params.cursor !== undefined) {
      queryParams.cursor = params.cursor;
    }
    
    return queryParams;
  }

  static parsePaginatedResponse<T>(data: any): PaginatedResponse<T> {
    return {
      items: data.items || [],
      page: data.page || 1,
      pageSize: data.pageSize || 10,
      total: data.total || 0,
      hasNext: data.hasNext ?? (data.page * data.pageSize < data.total),
      hasPrev: data.hasPrev ?? (data.page > 1)
    };
  }

  static getNextPageParams(current: PaginatedResponse<any>): PaginationParams | null {
    if (!current.hasNext) return null;
    
    return {
      page: current.page + 1,
      pageSize: current.pageSize
    };
  }

  static getPrevPageParams(current: PaginatedResponse<any>): PaginationParams | null {
    if (!current.hasPrev) return null;
    
    return {
      page: current.page - 1,
      pageSize: current.pageSize
    };
  }
}

import { ApiError } from './types';

export class ApiClientError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly details?: any;

  constructor(error: ApiError | string) {
    if (typeof error === 'string') {
      super(error);
    } else {
      super(error.message);
      this.status = error.status;
      this.code = error.code;
      this.details = error.details;
    }
    this.name = 'ApiClientError';
  }

  static isNetworkError(error: any): boolean {
    return error instanceof TypeError || 
           error.name === 'TypeError' ||
           error.message?.includes('fetch') ||
           error.message?.includes('network');
  }

  static isTimeoutError(error: any): boolean {
    return error.name === 'AbortError' ||
           error.message?.includes('timeout') ||
           error.message?.includes('aborted');
  }

  static isRetryableError(error: any): boolean {
    if (this.isNetworkError(error) || this.isTimeoutError(error)) {
      return true;
    }
    
    if (error instanceof ApiClientError) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.status || 0);
    }
    
    return false;
  }
}

export function parseApiError(response: Response, body?: any): ApiClientError {
  let message = 'API request failed';
  let code: string | undefined;
  let details: any;

  if (body && typeof body === 'object') {
    message = body.message || body.error || message;
    code = body.code;
    details = body.details || body.errors;
  } else if (typeof body === 'string') {
    message = body;
  }

  return new ApiClientError({
    message,
    status: response.status,
    code,
    details
  });
}

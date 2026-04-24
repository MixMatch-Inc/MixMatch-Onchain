import { 
  ApiClientConfig, 
  RequestConfig, 
  ApiResponse, 
  FetchImplementation,
  RetryConfig 
} from './types';
import { ApiClientError, parseApiError } from './errors';
import { AuthInjector, AuthProvider } from './auth';
import { PaginationHelper } from './pagination';
import { retryWithBackoff, defaultRetryConfig } from './retry';

export class ApiClient {
  private config: ApiClientConfig;
  private authInjector?: AuthInjector;
  private fetchImpl: FetchImplementation;

  constructor(
    config: ApiClientConfig,
    authProvider?: AuthProvider,
    fetchImpl: FetchImplementation = fetch
  ) {
    this.config = {
      timeout: 10000,
      retryConfig: defaultRetryConfig,
      ...config
    };
    
    if (authProvider) {
      this.authInjector = new AuthInjector(authProvider);
    }
    
    this.fetchImpl = fetchImpl;
  }

  async request<T = any>(
    endpoint: string,
    requestConfig: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const config = this.mergeConfig(requestConfig);
    
    const operation = async () => {
      const response = await this.executeRequest(url, config);
      const data = await this.parseResponse<T>(response);
      
      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers)
      };
    };

    const retryConfig = config.retries !== undefined 
      ? { ...this.config.retryConfig!, maxRetries: config.retries }
      : this.config.retryConfig!;

    return retryWithBackoff(operation, retryConfig);
  }

  async get<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T = any>(endpoint: string, body?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async patch<T = any>(endpoint: string, body?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  async delete<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  private buildUrl(endpoint: string): string {
    const baseUrl = this.config.baseURL.endsWith('/') 
      ? this.config.baseURL.slice(0, -1) 
      : this.config.baseURL;
    
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    return `${baseUrl}${path}`;
  }

  private mergeConfig(requestConfig: RequestConfig): RequestConfig {
    return {
      timeout: this.config.timeout,
      headers: { ...this.config.defaultHeaders, ...requestConfig.headers },
      ...requestConfig
    };
  }

  private async executeRequest(url: string, config: RequestConfig): Promise<Response> {
    const headers = this.authInjector 
      ? await this.authInjector.injectAuth(config.headers || {})
      : config.headers || {};

    const controller = new AbortController();
    const timeoutId = config.timeout 
      ? setTimeout(() => controller.abort(), config.timeout)
      : null;

    try {
      const response = await this.fetchImpl(url, {
        method: config.method || 'GET',
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: config.signal || controller.signal
      });

      if (!response.ok) {
        const body = await this.safeParseJson(response);
        throw parseApiError(response, body);
      }

      return response;
    } catch (error) {
      if (this.authInjector && ApiClientError.isRetryableError(error)) {
        await this.authInjector.handleAuthError(error);
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    
    if (contentType?.includes('text/')) {
      return (await response.text()) as unknown as T;
    }
    
    return response.body as unknown as T;
  }

  private async safeParseJson(response: Response): Promise<any> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}

export function createApiClient(
  config: ApiClientConfig,
  authProvider?: AuthProvider,
  fetchImpl?: FetchImplementation
): ApiClient {
  return new ApiClient(config, authProvider, fetchImpl);
}

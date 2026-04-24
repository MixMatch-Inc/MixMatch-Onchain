import { RetryConfig } from './types';
import { ApiClientError } from './errors';

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === config.maxRetries) {
        throw lastError;
      }
      
      if (config.retryCondition && !config.retryCondition(error)) {
        throw lastError;
      }
      
      const delay = calculateRetryDelay(config.retryDelay, attempt);
      config.onRetry?.(error, attempt + 1);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

function calculateRetryDelay(baseDelay: number, attempt: number): number {
  return baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
}

export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryCondition: (error) => ApiClientError.isRetryableError(error)
};

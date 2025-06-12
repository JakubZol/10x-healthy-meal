import { OpenRouterError, isRetryableError, getRetryDelay } from '../errors/openrouter-errors';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (error: any, attempt: number) => void;
}

export class RetryHandler {
  private static readonly DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    onRetry: () => {},
  };

  /**
   * Execute an operation with retry logic and exponential backoff
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: any;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // If this is the last attempt, throw the error
        if (attempt === config.maxRetries) {
          throw error;
        }

        // Check if the error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Calculate delay for this attempt
        const delay = this.calculateDelay(error, attempt, config);
        
        // Call onRetry callback if provided
        config.onRetry(error, attempt + 1);

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Determine if an error should be retried
   */
  private static isRetryableError(error: any): boolean {
    // If it's an OpenRouterError, use our specific logic
    if (error instanceof OpenRouterError) {
      return isRetryableError(error);
    }

    // For other errors, check common retryable conditions
    if (error.code) {
      const retryableCodes = [
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'EAI_AGAIN',
        'ECONNABORTED'
      ];
      return retryableCodes.includes(error.code);
    }

    // Check HTTP status codes for axios errors
    if (error.response?.status) {
      const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
      return retryableStatusCodes.includes(error.response.status);
    }

    // Network errors without response
    if (error.request && !error.response) {
      return true;
    }

    return false;
  }

  /**
   * Calculate delay for retry attempt
   */
  private static calculateDelay(
    error: any,
    attempt: number,
    config: Required<RetryOptions>
  ): number {
    // If it's an OpenRouterError, use specific delay calculation
    if (error instanceof OpenRouterError) {
      return getRetryDelay(error, attempt, config.baseDelay);
    }

    // Standard exponential backoff for other errors
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retryable version of an async function
   */
  static withRetry<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    options: RetryOptions = {}
  ): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs): Promise<TReturn> => {
      return this.executeWithRetry(() => fn(...args), options);
    };
  }

  /**
   * Execute multiple operations with retry, failing fast if any non-retryable error occurs
   */
  static async executeAllWithRetry<T>(
    operations: Array<() => Promise<T>>,
    options: RetryOptions = {}
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (const operation of operations) {
      const result = await this.executeWithRetry(operation, options);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Execute operations in parallel with retry
   */
  static async executeParallelWithRetry<T>(
    operations: Array<() => Promise<T>>,
    options: RetryOptions = {}
  ): Promise<T[]> {
    const promises = operations.map(operation => 
      this.executeWithRetry(operation, options)
    );
    
    return Promise.all(promises);
  }
}

/**
 * Decorator for adding retry logic to class methods
 */
export function withRetry(options: RetryOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return RetryHandler.executeWithRetry(
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

/**
 * Circuit breaker pattern implementation for additional resilience
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }
} 
/**
 * Week 2 Days 3-4: Error Resilience Utilities
 *
 * Implements retry logic with exponential backoff and circuit breaker pattern
 * for production-grade error handling.
 */

// ========================================
// Retry Logic with Exponential Backoff
// ========================================

export interface RetryOptions {
  maxRetries: number;
  backoff: 'exponential' | 'linear' | 'fixed';
  baseDelay?: number; // milliseconds
  maxDelay?: number; // max delay cap
  onFailedAttempt?: (error: Error, attempt: number) => void;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxRetries,
    backoff = 'exponential',
    baseDelay = 1000,
    maxDelay = 30000,
    onFailedAttempt
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        console.error(`[Retry] All ${maxRetries} attempts failed:`, lastError.message);
        throw lastError;
      }

      if (onFailedAttempt) {
        onFailedAttempt(lastError, attempt + 1);
      }

      // Calculate delay
      let delay: number;
      switch (backoff) {
        case 'exponential':
          delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          break;
        case 'linear':
          delay = baseDelay * (attempt + 1);
          break;
        case 'fixed':
        default:
          delay = baseDelay;
      }

      console.log(`[Retry] Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// ========================================
// Circuit Breaker Pattern
// ========================================

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening
  resetTimeout: number; // Time in ms before attempting to close
  monitoringPeriod?: number; // Time window for failure counting
}

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      failureThreshold: options.failureThreshold,
      resetTimeout: options.resetTimeout,
      monitoringPeriod: options.monitoringPeriod || 60000, // 1 minute default
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition states
    this.updateState();

    if (this.state === CircuitState.OPEN) {
      const waitTime = this.nextAttemptTime
        ? Math.ceil((this.nextAttemptTime - Date.now()) / 1000)
        : 0;
      throw new Error(
        `Circuit breaker is OPEN. Service unavailable. Retry in ${waitTime}s.`
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private updateState() {
    const now = Date.now();

    // Transition from OPEN to HALF_OPEN after reset timeout
    if (
      this.state === CircuitState.OPEN &&
      this.nextAttemptTime &&
      now >= this.nextAttemptTime
    ) {
      console.log('[CircuitBreaker] Transitioning to HALF_OPEN (testing recovery)');
      this.state = CircuitState.HALF_OPEN;
      this.failures = 0;
    }

    // Reset failure count if monitoring period has elapsed
    if (
      this.lastFailureTime &&
      now - this.lastFailureTime > this.options.monitoringPeriod
    ) {
      this.failures = 0;
    }
  }

  private onSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      console.log('[CircuitBreaker] Service recovered. Transitioning to CLOSED');
      this.state = CircuitState.CLOSED;
    }
    this.failures = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    console.log(
      `[CircuitBreaker] Failure ${this.failures}/${this.options.failureThreshold}`
    );

    if (this.failures >= this.options.failureThreshold) {
      console.log('[CircuitBreaker] Threshold exceeded. Opening circuit');
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeout;
    }
  }

  getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    console.log('[CircuitBreaker] Manually reset to CLOSED');
  }
}

// ========================================
// Combined: Retry with Circuit Breaker
// ========================================

export async function retryWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  retryOptions: RetryOptions,
  circuitBreaker: CircuitBreaker
): Promise<T> {
  return await circuitBreaker.execute(() => retry(fn, retryOptions));
}

// ========================================
// Singleton Circuit Breakers for Services
// ========================================

export const dmcSettingsCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
});

export const serviceRateCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
});

export const itineraryGenerationCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds
});

// ========================================
// Helper: Retry-enabled service wrapper
// ========================================

export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: Partial<RetryOptions>
): T {
  return (async (...args: Parameters<T>) => {
    return await retry(
      () => fn(...args),
      {
        maxRetries: 3,
        backoff: 'exponential',
        baseDelay: 1000,
        maxDelay: 10000,
        onFailedAttempt: (error, attempt) => {
          console.log(`[withRetry] Attempt ${attempt} failed:`, error.message);
        },
        ...options,
      }
    );
  }) as T;
}

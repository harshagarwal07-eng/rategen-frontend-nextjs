/**
 * Advanced Retry Manager with Exponential Backoff
 *
 * Features:
 * - Configurable retry strategies
 * - Circuit breaker pattern
 * - Jitter to prevent thundering herd
 * - Retry condition customization
 * - Comprehensive logging and metrics
 */

export interface RetryOptions {
  maxAttempts?: number; // Default: 3
  baseDelay?: number; // Default: 1000ms
  maxDelay?: number; // Default: 30000ms
  multiplier?: number; // Default: 2
  jitter?: boolean; // Default: true
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any, delay: number) => void;
  circuitBreaker?: CircuitBreakerOptions;
}

export interface CircuitBreakerOptions {
  enabled?: boolean; // Default: false
  failureThreshold?: number; // Default: 5
  recoveryTimeout?: number; // Default: 60000ms
  monitoringPeriod?: number; // Default: 120000ms
}

export interface RetryMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  circuitBreakerTrips: number;
  currentFailures: number;
  lastFailureTime?: number;
}

export enum CircuitBreakerState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Rejecting all calls
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: number;
  private successCount = 0;

  constructor(private options: Required<CircuitBreakerOptions>) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.options.enabled && !this.canExecute()) {
      throw new Error(`Circuit breaker is ${this.state}. Rejecting call.`);
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

  private canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        if (now - (this.lastFailureTime || 0) >= this.options.recoveryTimeout) {
          this.state = CircuitBreakerState.HALF_OPEN;
          this.successCount = 0;
          console.log(`🔌 [CIRCUIT_BREAKER] Transitioning to HALF_OPEN`);
          return true;
        }
        return false;

      case CircuitBreakerState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) {
        // Allow 3 successes to close the circuit
        this.state = CircuitBreakerState.CLOSED;
        console.log(
          `🔌 [CIRCUIT_BREAKER] Circuit closed after ${this.successCount} successful calls`
        );
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      console.log(
        `🔌 [CIRCUIT_BREAKER] Circuit re-opened after failure in HALF_OPEN state`
      );
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      console.log(
        `🔌 [CIRCUIT_BREAKER] Circuit opened after ${this.failureCount} failures`
      );
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = undefined;
    this.successCount = 0;
    console.log(`🔌 [CIRCUIT_BREAKER] Circuit manually reset`);
  }
}

export class RetryManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private metrics: Map<string, RetryMetrics> = new Map();

  constructor(private defaultOptions: RetryOptions = {}) {}

  /**
   * Execute an operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    identifier: string,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    const metrics = this.getOrCreateMetrics(identifier);

    // Create circuit breaker if enabled
    let circuitBreaker: CircuitBreaker | undefined;
    if (config.circuitBreaker?.enabled) {
      circuitBreaker = this.getOrCreateCircuitBreaker(
        identifier,
        config.circuitBreaker
      );
    }

    let lastError: any;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= (config.maxAttempts || 3); attempt++) {
      metrics.totalAttempts++;

      try {
        console.log(
          `🔄 [RETRY] Attempt ${attempt}/${config.maxAttempts} for ${identifier}`
        );

        const result = circuitBreaker
          ? await circuitBreaker.execute(operation)
          : await operation();

        metrics.successfulAttempts++;
        console.log(
          `✅ [RETRY] Success on attempt ${attempt} for ${identifier} (total delay: ${totalDelay}ms)`
        );

        return result;
      } catch (error) {
        lastError = error;
        metrics.failedAttempts++;
        metrics.currentFailures++;
        metrics.lastFailureTime = Date.now();

        console.log(
          `❌ [RETRY] Attempt ${attempt} failed for ${identifier}:`,
          (error as Error)?.message
        );

        // Check if we should retry
        if (attempt >= (config.maxAttempts || 3)) {
          console.log(`🛑 [RETRY] Max attempts reached for ${identifier}`);
          break;
        }

        if (config.retryCondition && !config.retryCondition(error)) {
          console.log(`🛑 [RETRY] Retry condition not met for ${identifier}`);
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt - 1, config);
        totalDelay += delay;

        console.log(
          `⏳ [RETRY] Waiting ${delay}ms before retry ${
            attempt + 1
          } for ${identifier}`
        );

        if (config.onRetry) {
          config.onRetry(attempt, error, delay);
        }

        // Wait before retry
        await this.sleep(delay);
      }
    }

    console.error(
      `💥 [RETRY] All retries failed for ${identifier} after ${totalDelay}ms total delay`
    );
    throw lastError;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryOptions): number {
    const baseDelay = config.baseDelay || 1000;
    const maxDelay = config.maxDelay || 30000;
    const multiplier = config.multiplier || 2;

    // Exponential backoff: delay = baseDelay * multiplier^attempt
    let delay = baseDelay * Math.pow(multiplier, attempt);

    // Apply jitter to prevent thundering herd
    if (config.jitter !== false) {
      // Add random jitter: ±25% of the delay
      const jitterRange = delay * 0.25;
      delay = delay + Math.random() * jitterRange * 2 - jitterRange;
    }

    // Ensure delay is within bounds
    return Math.max(0, Math.min(delay, maxDelay));
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get or create metrics for an identifier
   */
  private getOrCreateMetrics(identifier: string): RetryMetrics {
    if (!this.metrics.has(identifier)) {
      this.metrics.set(identifier, {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        circuitBreakerTrips: 0,
        currentFailures: 0,
      });
    }
    return this.metrics.get(identifier)!;
  }

  /**
   * Get or create circuit breaker for an identifier
   */
  private getOrCreateCircuitBreaker(
    identifier: string,
    options: CircuitBreakerOptions
  ): CircuitBreaker {
    if (!this.circuitBreakers.has(identifier)) {
      const defaultCircuitOptions: Required<CircuitBreakerOptions> = {
        enabled: true,
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 120000,
      };

      this.circuitBreakers.set(
        identifier,
        new CircuitBreaker({ ...defaultCircuitOptions, ...options })
      );
    }
    return this.circuitBreakers.get(identifier)!;
  }

  /**
   * Get metrics for all operations
   */
  getMetrics(): Record<string, RetryMetrics> {
    const result: Record<string, RetryMetrics> = {};
    for (const [identifier, metrics] of this.metrics.entries()) {
      result[identifier] = { ...metrics };
    }
    return result;
  }

  /**
   * Get metrics for a specific operation
   */
  getOperationMetrics(identifier: string): RetryMetrics | undefined {
    return this.metrics.get(identifier);
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates(): Record<
    string,
    { state: CircuitBreakerState; failures: number }
  > {
    const result: Record<
      string,
      { state: CircuitBreakerState; failures: number }
    > = {};
    for (const [identifier, breaker] of this.circuitBreakers.entries()) {
      result[identifier] = {
        state: breaker.getState(),
        failures: breaker.getFailureCount(),
      };
    }
    return result;
  }

  /**
   * Reset circuit breaker for an operation
   */
  resetCircuitBreaker(identifier: string): void {
    const breaker = this.circuitBreakers.get(identifier);
    if (breaker) {
      breaker.reset();
      console.log(`🔄 [RETRY] Circuit breaker reset for ${identifier}`);
    }
  }

  /**
   * Reset all metrics and circuit breakers
   */
  reset(): void {
    this.metrics.clear();
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
    console.log(`🔄 [RETRY] All metrics and circuit breakers reset`);
  }
}

// Global retry manager instance
export const retryManager = new RetryManager({
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  jitter: true,
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    recoveryTimeout: 60000,
    monitoringPeriod: 120000,
  },
});

/**
 * Default retry condition for common error types
 */
export const defaultRetryCondition = (error: any): boolean => {
  // Retry on network errors
  if (
    error.code === "ECONNRESET" ||
    error.code === "ETIMEDOUT" ||
    error.code === "ENOTFOUND"
  ) {
    return true;
  }

  // Retry on HTTP 5xx errors
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // Retry on HTTP 429 (Too Many Requests)
  if (error.status === 429) {
    return true;
  }

  // Retry on timeout errors
  if (error.name === "TimeoutError" || error.message.includes("timeout")) {
    return true;
  }

  // Don't retry on client errors (4xx except 429)
  if (error.status >= 400 && error.status < 500 && error.status !== 429) {
    return false;
  }

  // Default to retry for unknown errors
  return true;
};

/**
 * Decorator to add retry functionality to any async function
 */
export function withRetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  identifier: string,
  options?: RetryOptions
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return retryManager.execute(() => fn(...args), identifier, options);
  };
}

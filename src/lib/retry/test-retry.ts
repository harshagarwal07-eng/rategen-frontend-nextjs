import {
  retryManager,
  withRetry,
  defaultRetryCondition,
  type RetryOptions,
} from "./retry-manager";

/**
 * Test script to demonstrate retry logic and circuit breaker functionality
 */
async function testRetryMechanisms() {
  console.log("🔄 Testing Retry Manager and Circuit Breaker\n");

  // Test 1: Basic retry functionality
  console.log("--- Test 1: Basic Retry ---");
  let attemptCount = 0;
  const flakyOperation = async () => {
    attemptCount++;
    console.log(`📞 Attempt ${attemptCount}`);

    if (attemptCount < 3) {
      throw new Error(`Simulated failure ${attemptCount}`);
    }

    return "Success after retries!";
  };

  try {
    const result = await retryManager.execute(
      flakyOperation,
      "flaky-operation",
      {
        maxAttempts: 5,
        baseDelay: 100,
        onRetry: (attempt, error, delay) => {
          console.log(
            `🔄 Retry ${attempt}: ${error.message}, waiting ${delay}ms`
          );
        },
      }
    );
    console.log(`✅ Result: ${result}\n`);
  } catch (error) {
    console.log(`❌ Failed: ${(error as Error)?.message}\n`);
  }

  // Test 2: Circuit breaker functionality
  console.log("--- Test 2: Circuit Breaker ---");
  let circuitAttemptCount = 0;
  const failingOperation = async () => {
    circuitAttemptCount++;
    throw new Error(`Circuit breaker test failure ${circuitAttemptCount}`);
  };

  try {
    // This should trigger the circuit breaker after 3 failures
    for (let i = 0; i < 5; i++) {
      try {
        await retryManager.execute(failingOperation, "circuit-test", {
          maxAttempts: 1, // Don't retry - we want to trigger circuit breaker
          circuitBreaker: {
            enabled: true,
            failureThreshold: 3,
            recoveryTimeout: 2000, // 2 seconds for testing
            monitoringPeriod: 10000,
          },
        });
      } catch (error) {
        console.log(
          `❌ Operation ${i + 1} failed: ${(error as Error)?.message}`
        );
      }
    }

    // Check circuit breaker state
    const states = retryManager.getCircuitBreakerStates();
    console.log(`🔌 Circuit breaker state:`, states["circuit-test"]);

    // Wait for recovery timeout
    console.log(`⏳ Waiting for circuit breaker recovery...`);
    await new Promise((resolve) => setTimeout(resolve, 2100));

    // Try again - should work once
    const workingOperation = async () => "Circuit recovered!";
    try {
      const result = await retryManager.execute(
        workingOperation,
        "circuit-test",
        {
          maxAttempts: 1,
        }
      );
      console.log(`✅ After recovery: ${result}`);
    } catch (error) {
      console.log(`❌ Still failed: ${(error as Error)?.message}`);
    }
  } catch (error) {
    console.log(`❌ Circuit breaker test failed: ${(error as Error)?.message}`);
  }

  // Test 3: Retry condition filtering
  console.log(`\n--- Test 3: Retry Condition Filtering ---`);
  let conditionalAttemptCount = 0;
  const conditionalOperation = async () => {
    conditionalAttemptCount++;

    if (conditionalAttemptCount === 1) {
      // Non-retryable error (400)
      const error = new Error("Bad request");
      (error as any).status = 400;
      throw error;
    } else if (conditionalAttemptCount === 2) {
      // Retryable error (500)
      const error = new Error("Server error");
      (error as any).status = 500;
      throw error;
    }

    return "Success with conditional retry!";
  };

  try {
    const result = await retryManager.execute(
      conditionalOperation,
      "conditional-retry",
      {
        maxAttempts: 3,
        baseDelay: 100,
        retryCondition: (error) => {
          // Only retry on 5xx errors, not 4xx
          return error.status >= 500 || !error.status;
        },
      }
    );
    console.log(`✅ Conditional retry result: ${result}`);
  } catch (error) {
    console.log(`❌ Conditional retry failed: ${(error as Error)?.message}`);
  }

  // Test 4: Decorator pattern
  console.log(`\n--- Test 4: Retry Decorator ---`);
  let decoratorAttemptCount = 0;

  const decoratedFunction = withRetry(
    async () => {
      decoratorAttemptCount++;
      if (decoratorAttemptCount < 2) {
        throw new Error("Decorator test failure");
      }
      return "Decorator success!";
    },
    "decorator-test",
    {
      maxAttempts: 3,
      baseDelay: 50,
    }
  );

  try {
    const result = await decoratedFunction();
    console.log(`✅ Decorator result: ${result}`);
  } catch (error) {
    console.log(`❌ Decorator failed: ${(error as Error)?.message}`);
  }

  // Show final metrics
  console.log(`\n--- Final Metrics ---`);
  const allMetrics = retryManager.getMetrics();
  for (const [operation, metrics] of Object.entries(allMetrics)) {
    console.log(`${operation}:`);
    console.log(`  Total attempts: ${metrics.totalAttempts}`);
    console.log(`  Successful: ${metrics.successfulAttempts}`);
    console.log(`  Failed: ${metrics.failedAttempts}`);
    console.log(
      `  Success rate: ${Math.round(
        (metrics.successfulAttempts / metrics.totalAttempts) * 100
      )}%`
    );
  }

  console.log(`\n🎉 Retry testing completed!`);
}

// Export for testing
export { testRetryMechanisms };

// Run if called directly
if (require.main === module) {
  testRetryMechanisms().catch(console.error);
}

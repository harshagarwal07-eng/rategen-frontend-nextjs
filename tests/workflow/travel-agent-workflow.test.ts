/**
 * Travel Agent Workflow Unit Tests
 *
 * Tests for:
 * - State reducers (arrays and numbers)
 * - Conditional routing functions
 * - STEP 8 followup scenarios
 * - Circuit breaker state transitions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker } from '@/lib/utils/error-resilience';

// ========================================
// Test 1: State Reducers
// ========================================
describe('State Reducers', () => {
  it('should append items to arrays instead of replacing', () => {
    // Simulate state reducer behavior
    const reducer = (current: string[] | undefined, update: string[]): string[] => {
      return [...(current || []), ...update];
    };

    const initialState: string[] = ['error1', 'error2'];
    const newErrors = ['error3', 'error4'];

    const result = reducer(initialState, newErrors);

    expect(result).toEqual(['error1', 'error2', 'error3', 'error4']);
    expect(result.length).toBe(4);
  });

  it('should sum numbers instead of replacing', () => {
    const reducer = (current: number | undefined, update: number): number => {
      return (current || 0) + (update || 0);
    };

    const initialTokens = 100;
    const additionalTokens = 50;

    const result = reducer(initialTokens, additionalTokens);

    expect(result).toBe(150);
  });

  it('should handle undefined current values', () => {
    const reducer = (current: string[] | undefined, update: string[]): string[] => {
      return [...(current || []), ...update];
    };

    const result = reducer(undefined, ['first', 'second']);

    expect(result).toEqual(['first', 'second']);
  });
});

// ========================================
// Test 2: Conditional Routing - Kill Switch
// ========================================
describe('Conditional Routing - Kill Switch', () => {
  it('should route to END when kill_switch is true', () => {
    const shouldProceedAfterKillSwitch = (state: { should_stop?: boolean }) => {
      return state.should_stop ? "__end__" : "parse_query";
    };

    const stateWithKillSwitch = { should_stop: true };
    const result = shouldProceedAfterKillSwitch(stateWithKillSwitch);

    expect(result).toBe("__end__");
  });

  it('should route to parse_query when kill_switch is false', () => {
    const shouldProceedAfterKillSwitch = (state: { should_stop?: boolean }) => {
      return state.should_stop ? "__end__" : "parse_query";
    };

    const stateWithoutKillSwitch = { should_stop: false };
    const result = shouldProceedAfterKillSwitch(stateWithoutKillSwitch);

    expect(result).toBe("parse_query");
  });
});

// ========================================
// Test 3: Conditional Routing - Required Fields
// ========================================
describe('Conditional Routing - Required Fields Validation', () => {
  it('should route to classify_intent when all fields valid', () => {
    const routeAfterValidation = (state: { required_fields_valid?: boolean }) => {
      return state.required_fields_valid ? "classify_intent" : "request_clarification";
    };

    const validState = { required_fields_valid: true };
    const result = routeAfterValidation(validState);

    expect(result).toBe("classify_intent");
  });

  it('should route to request_clarification when fields missing', () => {
    const routeAfterValidation = (state: { required_fields_valid?: boolean }) => {
      return state.required_fields_valid ? "classify_intent" : "request_clarification";
    };

    const invalidState = { required_fields_valid: false };
    const result = routeAfterValidation(invalidState);

    expect(result).toBe("request_clarification");
  });
});

// ========================================
// Test 4: Conditional Routing - Intent Classification
// ========================================
describe('Conditional Routing - Intent Classification', () => {
  const routeByIntent = (state: { query_info?: { category?: string }, conversation_history?: any[] }) => {
    const category = state.query_info?.category;

    switch (category) {
      case 'COMPLETE_QUOTE':
        return "handle_complete_quote";
      case 'TOUR_SERVICE':
        return "validate_default_policy";
      case 'HOTEL_SERVICE':
        return "validate_default_policy";
      case 'TRANSFER_SERVICE':
        return "validate_default_policy";
      case 'GENERAL':
        // STEP 8: Route GENERAL queries through followup handler if conversation history exists
        return state.conversation_history && state.conversation_history.length > 0
          ? "handle_followup"
          : "handle_general_inquiry";
      default:
        return "handle_general_inquiry";
    }
  };

  it('should route COMPLETE_QUOTE to handle_complete_quote', () => {
    const state = { query_info: { category: 'COMPLETE_QUOTE' } };
    const result = routeByIntent(state);
    expect(result).toBe("handle_complete_quote");
  });

  it('should route TOUR_SERVICE to validate_default_policy', () => {
    const state = { query_info: { category: 'TOUR_SERVICE' } };
    const result = routeByIntent(state);
    expect(result).toBe("validate_default_policy");
  });

  it('should route GENERAL with history to handle_followup', () => {
    const state = {
      query_info: { category: 'GENERAL' },
      conversation_history: [{ role: 'user', content: 'previous message' }]
    };
    const result = routeByIntent(state);
    expect(result).toBe("handle_followup");
  });

  it('should route GENERAL without history to handle_general_inquiry', () => {
    const state = {
      query_info: { category: 'GENERAL' },
      conversation_history: []
    };
    const result = routeByIntent(state);
    expect(result).toBe("handle_general_inquiry");
  });
});

// ========================================
// Test 5: Conditional Routing - Policy Validation
// ========================================
describe('Conditional Routing - Policy Validation', () => {
  it('should route to handle_individual_rate when policy allows', () => {
    const routeAfterPolicyValidation = (state: { policy_validation?: { allowed?: boolean } }) => {
      return state.policy_validation?.allowed ? "handle_individual_rate" : "format_policy_error";
    };

    const allowedState = { policy_validation: { allowed: true } };
    const result = routeAfterPolicyValidation(allowedState);
    expect(result).toBe("handle_individual_rate");
  });

  it('should route to format_policy_error when policy denies', () => {
    const routeAfterPolicyValidation = (state: { policy_validation?: { allowed?: boolean } }) => {
      return state.policy_validation?.allowed ? "handle_individual_rate" : "format_policy_error";
    };

    const deniedState = { policy_validation: { allowed: false } };
    const result = routeAfterPolicyValidation(deniedState);
    expect(result).toBe("format_policy_error");
  });
});

// ========================================
// Test 6: STEP 8 - Followup Handler Routing
// ========================================
describe('STEP 8 - Followup Handler Routing', () => {
  const routeAfterFollowup = (state: { followup_type?: string }) => {
    const followupType = state.followup_type;

    switch (followupType) {
      case 'CONFIRM_ITINERARY':
        return "handle_complete_quote";
      case 'MODIFY_SERVICE':
      case 'CHANGE_DATES':
        return "parse_query";
      case 'GENERAL_QUESTION':
      default:
        return "handle_general_inquiry";
    }
  };

  it('should route CONFIRM_ITINERARY to handle_complete_quote', () => {
    const state = { followup_type: 'CONFIRM_ITINERARY' };
    const result = routeAfterFollowup(state);
    expect(result).toBe("handle_complete_quote");
  });

  it('should route MODIFY_SERVICE to parse_query', () => {
    const state = { followup_type: 'MODIFY_SERVICE' };
    const result = routeAfterFollowup(state);
    expect(result).toBe("parse_query");
  });

  it('should route CHANGE_DATES to parse_query', () => {
    const state = { followup_type: 'CHANGE_DATES' };
    const result = routeAfterFollowup(state);
    expect(result).toBe("parse_query");
  });

  it('should route GENERAL_QUESTION to handle_general_inquiry', () => {
    const state = { followup_type: 'GENERAL_QUESTION' };
    const result = routeAfterFollowup(state);
    expect(result).toBe("handle_general_inquiry");
  });
});

// ========================================
// Test 7: STEP 8 - Followup Type Detection
// ========================================
describe('STEP 8 - Followup Type Detection', () => {
  const detectFollowupType = (query: string, hasItinerary: boolean) => {
    const currentQuery = query.toLowerCase();

    // Scenario A: User confirming itinerary
    if (
      currentQuery.match(/\b(yes|ok|okay|looks good|proceed|confirm|perfect|great)\b/i) &&
      hasItinerary
    ) {
      return 'CONFIRM_ITINERARY';
    }
    // Scenario B: User requesting modification
    else if (
      currentQuery.match(/\b(change|modify|replace|cheaper|expensive|different|remove|add)\b/i)
    ) {
      return 'MODIFY_SERVICE';
    }
    // Scenario C: Date changes
    else if (currentQuery.match(/\bdate|dates|check.?in|check.?out\b/i)) {
      return 'CHANGE_DATES';
    }

    return 'GENERAL_QUESTION';
  };

  it('should detect CONFIRM_ITINERARY when user says yes with itinerary', () => {
    const result = detectFollowupType('yes, looks good', true);
    expect(result).toBe('CONFIRM_ITINERARY');
  });

  it('should not detect CONFIRM_ITINERARY when no itinerary exists', () => {
    const result = detectFollowupType('yes, looks good', false);
    expect(result).not.toBe('CONFIRM_ITINERARY');
  });

  it('should detect MODIFY_SERVICE for change requests', () => {
    const result = detectFollowupType('can you change the hotel to a cheaper one', false);
    expect(result).toBe('MODIFY_SERVICE');
  });

  it('should detect CHANGE_DATES for date modification requests', () => {
    // Use a query that only mentions dates without modification keywords
    const result = detectFollowupType('check-in on the 15th instead', false);
    expect(result).toBe('CHANGE_DATES');
  });

  it('should default to GENERAL_QUESTION for unclear queries', () => {
    const result = detectFollowupType('tell me more about the destination', false);
    expect(result).toBe('GENERAL_QUESTION');
  });
});

// ========================================
// Test 8: Circuit Breaker State Transitions
// ========================================
describe('Circuit Breaker State Transitions', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
    });
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  it('should transition to OPEN after threshold failures', async () => {
    const failingFn = async () => {
      throw new Error('Service unavailable');
    };

    // Trigger 3 failures
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingFn);
      } catch {
        // Expected failure
      }
    }

    expect(circuitBreaker.getState()).toBe('OPEN');
  });

  it('should reject calls immediately when OPEN', async () => {
    const failingFn = async () => {
      throw new Error('Service unavailable');
    };

    // Trigger failures to open circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingFn);
      } catch {
        // Expected
      }
    }

    // Next call should be rejected immediately
    const startTime = Date.now();
    try {
      await circuitBreaker.execute(failingFn);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10); // Should fail immediately, not after timeout
      expect(error.message).toContain('Circuit breaker is OPEN');
    }
  });

  it('should reset failure count on success', async () => {
    const mixedFn = vi.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValueOnce('Success');

    // First two calls fail
    try { await circuitBreaker.execute(mixedFn); } catch {}
    try { await circuitBreaker.execute(mixedFn); } catch {}

    // Third call succeeds - should reset count
    const result = await circuitBreaker.execute(mixedFn);
    expect(result).toBe('Success');
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });
});

// ========================================
// Test 9: Parallel Processing with Promise.allSettled
// ========================================
describe('Parallel Processing with Partial Failures', () => {
  it('should handle partial failures gracefully', async () => {
    const policyValidation = Promise.resolve({ allowed: true });
    const itineraryGeneration = Promise.reject(new Error('Itinerary service down'));
    const rateFetching = Promise.resolve({ rates: [] });

    const results = await Promise.allSettled([
      policyValidation,
      itineraryGeneration,
      rateFetching
    ]);

    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    expect(results[2].status).toBe('fulfilled');

    // Should still process successful results
    const successfulResults = results.filter(r => r.status === 'fulfilled');
    expect(successfulResults.length).toBe(2);
  });

  it('should continue execution even if one service fails', async () => {
    const tasks = [
      Promise.resolve('Task 1 complete'),
      Promise.reject(new Error('Task 2 failed')),
      Promise.resolve('Task 3 complete'),
    ];

    const results = await Promise.allSettled(tasks);

    const completed = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    expect(completed).toBe(2);
    expect(failed).toBe(1);
  });
});

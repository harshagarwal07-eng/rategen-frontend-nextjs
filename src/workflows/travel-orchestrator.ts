import type { AgentState, StreamEvent } from "@/types/agent";
import { validateTravelAgentQuery, type TravelAgentQuery } from "@/validation/travel-agent-validation";
import { createQuoteAgentWorkflow, type QuoteAgentWorkflow } from "./quote-agent.workflow";
import { createItineraryAgentWorkflow, type ItineraryAgentWorkflow } from "./itinerary-agent.workflow";
import { createResponseFormatterService, type ResponseFormatterService } from "@/services/response-formatter.service";

/**
 * Travel Agent Orchestrator
 *
 * Routes requests to appropriate specialized workflows.
 * Handles general queries and provides intelligent routing.
 *
 * This replaces the monolithic workflow with clean separation of concerns.
 */

export interface OrchestratorMetrics {
  totalRequests: number;
  quoteRequests: number;
  itineraryRequests: number;
  generalRequests: number;
  errors: number;
  averageResponseTime: number;
}

export interface OrchestratorOptions {
  model?: string;
  enableMetrics?: boolean;
  fallbackToGeneral?: boolean;
}

export class TravelAgentOrchestrator {
  private quoteWorkflow: QuoteAgentWorkflow;
  private itineraryWorkflow: ItineraryAgentWorkflow;
  private responseFormatter: ResponseFormatterService;
  private metrics: OrchestratorMetrics;

  constructor(options: OrchestratorOptions = {}) {
    this.quoteWorkflow = createQuoteAgentWorkflow();
    this.itineraryWorkflow = createItineraryAgentWorkflow();
    this.responseFormatter = createResponseFormatterService();

    this.metrics = {
      totalRequests: 0,
      quoteRequests: 0,
      itineraryRequests: 0,
      generalRequests: 0,
      errors: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Main entry point - routes request to appropriate workflow
   */
  async processRequest(state: AgentState, streamCallback?: (event: StreamEvent) => void): Promise<AgentState> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Validate input
      const validationResult = validateTravelAgentQuery(state);
      if (!validationResult.success) {
        throw new Error(`Invalid request: ${validationResult.error.issues[0].message}`);
      }

      // Determine request type and route
      const requestType = await this.determineRequestType(state);

      let result: AgentState;

      switch (requestType) {
        case "quote":
          this.metrics.quoteRequests++;
          result = await this.handleQuoteRequest(state, streamCallback);
          break;

        case "itinerary":
          this.metrics.itineraryRequests++;
          result = await this.handleItineraryRequest(state, streamCallback);
          break;

        case "general":
          this.metrics.generalRequests++;
          result = await this.handleGeneralRequest(state, streamCallback);
          break;

        case "individual_rate":
          this.metrics.quoteRequests++; // Individual rates are handled by quote workflow
          result = await this.handleIndividualRateRequest(state, streamCallback);
          break;

        default:
          throw new Error(`Unknown request type: ${requestType}`);
      }

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime);

      return result;
    } catch (error) {
      this.metrics.errors++;
      console.error("❌ [ORCHESTRATOR] Request failed:", error);

      const errorResponse = await this.createErrorResponse(state, error);
      return errorResponse;
    }
  }

  /**
   * Stream request processing
   */
  async *streamRequest(state: AgentState): AsyncGenerator<any, void, unknown> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Validate input
      const validationResult = validateTravelAgentQuery(state);
      if (!validationResult.success) {
        throw new Error(`Invalid request: ${validationResult.error.issues[0].message}`);
      }

      // Determine request type
      const requestType = await this.determineRequestType(state);

      // Stream based on request type
      switch (requestType) {
        case "quote":
          this.metrics.quoteRequests++;
          yield* this.quoteWorkflow.stream(state as any);
          break;

        case "itinerary":
          this.metrics.itineraryRequests++;
          yield* this.itineraryWorkflow.stream(state as any);
          break;

        case "general":
          this.metrics.generalRequests++;
          yield* this.streamGeneralResponse(state);
          break;

        case "individual_rate":
          this.metrics.quoteRequests++;
          yield* this.quoteWorkflow.stream(state as any);
          break;

        default:
          throw new Error(`Unknown request type: ${requestType}`);
      }

      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime);
    } catch (error) {
      this.metrics.errors++;
      console.error("❌ [ORCHESTRATOR] Streaming request failed:", error);
      yield { error: (error as Error)?.message };
    }
  }

  /**
   * Determine the type of request
   */
  private async determineRequestType(state: AgentState): Promise<string> {
    // If we have parsed intent, use it
    if (state.parsed_intent?.request_type) {
      return state.parsed_intent.request_type;
    }

    // Simple heuristic based on query content
    const query = state.query.toLowerCase();

    if (query.includes("price") || query.includes("cost") || query.includes("rate") || query.includes("quote")) {
      return "quote";
    }

    if (
      query.includes("itinerary") ||
      query.includes("plan") ||
      query.includes("day by day") ||
      query.includes("schedule")
    ) {
      return "itinerary";
    }

    if (
      query.includes("how much") &&
      (query.includes("tour") || query.includes("hotel") || query.includes("transfer"))
    ) {
      return "individual_rate";
    }

    // Default to general query
    return "general";
  }

  /**
   * Handle quote requests
   */
  private async handleQuoteRequest(
    state: AgentState,
    streamCallback?: (event: StreamEvent) => void,
  ): Promise<AgentState> {
    return await this.quoteWorkflow.invoke(state as any, streamCallback);
  }

  /**
   * Handle itinerary requests
   */
  private async handleItineraryRequest(
    state: AgentState,
    streamCallback?: (event: StreamEvent) => void,
  ): Promise<AgentState> {
    return await this.itineraryWorkflow.invoke(state as any, streamCallback);
  }

  /**
   * Handle general queries
   */
  private async handleGeneralRequest(
    state: AgentState,
    streamCallback?: (event: StreamEvent) => void,
  ): Promise<AgentState> {
    streamCallback?.({
      type: "step-start",
      step: "format_response",
      name: "Answering your question",
    });

    try {
      const response = await this.responseFormatter.formatResponse({
        query: state.query,
        parsedIntent: state.parsed_intent || {
          request_type: "general",
          is_followup: false,
        },
        conversationHistory: state.messages?.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      streamCallback?.({
        type: "step-complete",
        step: "format_response",
        duration_ms: 0,
      });

      streamCallback?.({
        type: "text-complete",
        content: response,
      });

      return {
        ...state,
        formatted_response: response,
        current_step: "format_response",
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("❌ [ORCHESTRATOR] General response failed:", error);
      throw error;
    }
  }

  /**
   * Handle individual service rate requests
   */
  private async handleIndividualRateRequest(
    state: AgentState,
    streamCallback?: (event: StreamEvent) => void,
  ): Promise<AgentState> {
    // Individual rate requests are handled by the quote workflow
    // with specific intent set
    const individualRateState = {
      ...state,
      parsed_intent: {
        ...state.parsed_intent,
        request_type: "individual_rate",
      },
    };

    return await this.quoteWorkflow.invoke(individualRateState as any, streamCallback);
  }

  /**
   * Stream general response
   */
  private async *streamGeneralResponse(state: AgentState): AsyncGenerator<any, void, unknown> {
    yield {
      type: "step-start",
      step: "format_response",
      name: "Answering your question",
    };

    try {
      for await (const chunk of this.responseFormatter.streamResponse({
        query: state.query,
        parsedIntent: state.parsed_intent || {
          request_type: "general",
          is_followup: false,
        },
        conversationHistory: state.messages?.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      })) {
        yield {
          type: "text-delta",
          content: chunk,
        };
      }

      yield {
        type: "step-complete",
        step: "format_response",
        duration_ms: 0,
      };
    } catch (error) {
      console.error("❌ [ORCHESTRATOR] General response streaming failed:", error);
      yield { error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Create error response
   */
  private async createErrorResponse(state: AgentState, error: any): Promise<AgentState> {
    const errorMessage = error.message || "An unexpected error occurred";

    return {
      ...state,
      error: errorMessage,
      formatted_response: `I apologize, but I encountered an error while processing your request: ${errorMessage}. Please try again or contact our support team for assistance.`,
      current_step: "format_response",
      timestamp: Date.now(),
    };
  }

  /**
   * Update orchestrator metrics
   */
  private updateMetrics(responseTime: number): void {
    const currentAverage = this.metrics.averageResponseTime;
    const totalRequests = this.metrics.totalRequests;

    // Calculate running average
    this.metrics.averageResponseTime = (currentAverage * (totalRequests - 1) + responseTime) / totalRequests;
  }

  /**
   * Get orchestrator metrics
   */
  getMetrics(): OrchestratorMetrics & {
    workflows: {
      quote: any;
      itinerary: any;
    };
    cache: any;
    retry: any;
  } {
    return {
      ...this.metrics,
      workflows: {
        quote: this.quoteWorkflow.getStats(),
        itinerary: this.itineraryWorkflow.getStats(),
      },
      cache: this.quoteWorkflow.getStats(), // Would be from MCP client
      retry: this.quoteWorkflow.getStats(), // Would be from retry manager
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      quoteRequests: 0,
      itineraryRequests: 0,
      generalRequests: 0,
      errors: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Health check for all workflows
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    workflows: {
      quote: string;
      itinerary: string;
    };
    dependencies: {
      mcp: string;
      llm: string;
    };
  }> {
    const health = {
      status: "healthy" as "healthy" | "degraded" | "unhealthy",
      workflows: {
        quote: "healthy" as "healthy" | "unhealthy",
        itinerary: "healthy" as "healthy" | "unhealthy",
      },
      dependencies: {
        mcp: "healthy" as "healthy" | "unhealthy",
        llm: "healthy" as "healthy" | "unhealthy",
      },
    };

    try {
      // Test quote workflow
      const quoteStats = this.quoteWorkflow.getStats();
      if (!quoteStats) {
        health.workflows.quote = "unhealthy";
        health.status = "degraded";
      }

      // Test itinerary workflow
      const itineraryStats = this.itineraryWorkflow.getStats();
      if (!itineraryStats) {
        health.workflows.itinerary = "unhealthy";
        health.status = "degraded";
      }
    } catch (error) {
      health.status = "unhealthy";
      console.error("❌ [ORCHESTRATOR] Health check failed:", error);
    }

    return health;
  }
}

/**
 * Factory function to create travel agent orchestrator
 */
export function createTravelAgentOrchestrator(options: OrchestratorOptions = {}): TravelAgentOrchestrator {
  return new TravelAgentOrchestrator(options);
}

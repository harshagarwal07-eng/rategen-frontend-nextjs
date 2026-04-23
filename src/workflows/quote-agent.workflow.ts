import { StateGraph, END, START } from "@langchain/langgraph";
import type { AgentState, StreamEvent } from "@/types/agent";
import {
  createQueryParserService,
  type QueryParserService,
  type ParsedQueryIntent,
} from "@/services/query-parser.service";
import {
  createMCPOperationsService,
  type MCPOperationsService,
} from "@/services/mcp-operations.service";
import {
  createResponseFormatterService,
  type ResponseFormatterService,
} from "@/services/response-formatter.service";
import {
  incrementChatTokens,
  createStep,
  updateStep,
} from "@/data-access/travel-agent";

/**
 * Quote Agent Workflow
 *
 * Specialized workflow for generating travel quotes.
 * Handles service search, pricing, and quote generation.
 *
 * Clean, testable, single-responsibility architecture
 */

export interface QuoteAgentState extends AgentState {
  parsed_intent?: ParsedQueryIntent;
  search_results?: any;
  services_with_pricing?: any[];
  quote_response?: string;
}

export class QuoteAgentWorkflow {
  private queryParser: QueryParserService;
  private mcpOperations: MCPOperationsService;
  private responseFormatter: ResponseFormatterService;
  private workflow: any;

  constructor() {
    this.queryParser = createQueryParserService();
    this.mcpOperations = createMCPOperationsService();
    this.responseFormatter = createResponseFormatterService();
    this.workflow = this.buildWorkflow();
  }

  /**
   * Build the quote agent workflow graph
   */
  private buildWorkflow() {
    const workflow = new StateGraph<any>({
      channels: {
        messages: {
          value: (left?: any, right?: any) => right ?? left ?? [],
          default: () => [],
        },
        query: {
          value: (left?: any, right?: any) => right ?? left ?? "",
          default: () => "",
        },
        model: {
          value: (left?: any, right?: any) =>
            right ?? left ?? "gemini-2.5-flash",
          default: () => "gemini-2.5-flash",
        },
        parsed_intent: {
          value: (left?: any, right?: any) => right ?? left,
          default: () => undefined,
        },
        search_results: {
          value: (left?: any, right?: any) => right ?? left,
          default: () => undefined,
        },
        services_with_pricing: {
          value: (left?: any, right?: any) => right ?? left ?? [],
          default: () => [],
        },
        quote_response: {
          value: (left?: any, right?: any) => right ?? left,
          default: () => undefined,
        },
        current_step: {
          value: (left?: any, right?: any) => right ?? left,
          default: () => "parse_query" as const,
        },
        error: {
          value: (left?: any, right?: any) => right ?? left,
          default: () => undefined,
        },
        chat_id: {
          value: (left?: any, right?: any) => right ?? left ?? "",
          default: () => "",
        },
        dmc_id: {
          value: (left?: any, right?: any) => right ?? left,
          default: () => undefined,
        },
        total_tokens: {
          value: (left?: any, right?: any) => right ?? left ?? 0,
          default: () => 0,
        },
        steps: {
          value: (left?: any, right?: any) => right ?? left ?? [],
          default: () => [],
        },
        timestamp: {
          value: (left?: any, right?: any) => right ?? left ?? 0,
          default: () => 0,
        },
      },
    });

    // Add nodes
    workflow.addNode("parse_query", this.parseQueryNode.bind(this));
    workflow.addNode("search_services", this.searchServicesNode.bind(this));
    workflow.addNode("get_pricing", this.getPricingNode.bind(this));
    workflow.addNode("format_quote", this.formatQuoteNode.bind(this));

    // Add edges
    (workflow as any).addEdge(START, "parse_query");
    (workflow as any).addEdge("parse_query", "search_services");
    (workflow as any).addEdge("search_services", "get_pricing");
    (workflow as any).addEdge("get_pricing", "format_quote");
    (workflow as any).addEdge("format_quote", END);

    return workflow.compile();
  }

  /**
   * Node: Parse user query
   */
  private async parseQueryNode(
    state: QuoteAgentState,
    config?: any
  ): Promise<Partial<QuoteAgentState>> {
    const streamCallback = config?.streamCallback;
    console.log("🔍 [QUOTE_AGENT] Parsing query for quote generation");
    const stepStartTime = Date.now();

    const step = await createStep({
      chat_id: state.chat_id,
      step_type: "parse_query",
      step_name: "Understanding your quote request",
      status: "running",
      started_at: new Date().toISOString(),
      retry_count: 0,
      retryable: true,
    });

    streamCallback?.({
      type: "step-start",
      step: "parse_query",
      name: "Understanding your quote request",
    });

    try {
      // Skip if already parsed
      if (state.parsed_intent) {
        console.log("🔍 [QUOTE_AGENT] Using existing parsed intent");
        return {
          parsed_intent: state.parsed_intent,
          current_step: "search_tours",
          steps: [...state.steps, step!],
        };
      }

      const messages = state.messages || [];
      const conversationHistory = messages.map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      }));

      const parsedIntent = await this.queryParser.parseQuery(
        state.query,
        conversationHistory
      );

      // Validate it's a quote request
      if (
        parsedIntent.request_type !== "quote" &&
        parsedIntent.request_type !== "general"
      ) {
        throw new Error(
          `This workflow handles quote requests, got: ${parsedIntent.request_type}`
        );
      }

      // Validate required fields
      const validation =
        this.queryParser.validateIntentForProcessing(parsedIntent);
      if (!validation.valid) {
        throw new Error(
          `Missing required information: ${validation.missing.join(", ")}`
        );
      }

      if (step) {
        await updateStep(step.id, {
          status: "completed",
          output: { parsed_intent: parsedIntent },
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - stepStartTime,
        });
      }

      streamCallback?.({
        type: "step-complete",
        step: "parse_query",
        duration_ms: Date.now() - stepStartTime,
      });

      return {
        parsed_intent: parsedIntent,
        current_step: "search_tours",
        steps: [...state.steps, step!],
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("❌ [QUOTE_AGENT] Query parsing failed:", error);

      if (step) {
        await updateStep(step.id, {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - stepStartTime,
        });
      }

      streamCallback?.({
        type: "step-error",
        step: "parse_query",
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        error: error instanceof Error ? error.message : String(error),
        current_step: "format_response",
        steps: [...state.steps, step!],
      };
    }
  }

  /**
   * Node: Search for travel services
   */
  private async searchServicesNode(
    state: QuoteAgentState,
    config?: any
  ): Promise<Partial<QuoteAgentState>> {
    const streamCallback = config?.streamCallback;
    console.log("🔍 [QUOTE_AGENT] Searching services for quote");
    const stepStartTime = Date.now();

    const step = await createStep({
      chat_id: state.chat_id,
      step_type: "search_tours",
      step_name: "Finding travel services",
      status: "running",
      started_at: new Date().toISOString(),
      retry_count: 0,
      retryable: true,
    });

    streamCallback?.({
      type: "step-start",
      step: "search_services",
      name: "Finding travel services",
    });

    try {
      const parsed = state.parsed_intent!;
      const searchParams = {
        dmc_id: state.dmc_id || "",
        search_text: parsed.search_text || state.query,
        country_name: parsed.country_name || parsed.destinations?.[0] || "",
      };

      console.log("🔍 [QUOTE_AGENT] Search params:", searchParams);

      const searchResults = await this.mcpOperations.searchAllServices(
        searchParams
      );

      if (searchResults.total === 0) {
        throw new Error("No services found for your destination and dates");
      }

      if (step) {
        await updateStep(step.id, {
          status: "completed",
          output: {
            services_found: searchResults.total,
            breakdown: {
              tours: searchResults.tours.length,
              hotels: searchResults.hotels.length,
              transfers: searchResults.transfers.length,
            },
          },
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - stepStartTime,
        });
      }

      streamCallback?.({
        type: "step-complete",
        step: "search_services",
        duration_ms: Date.now() - stepStartTime,
      });

      return {
        search_results: searchResults,
        current_step: "format_response",
        steps: [...state.steps, step!],
      };
    } catch (error) {
      console.error("❌ [QUOTE_AGENT] Service search failed:", error);

      if (step) {
        await updateStep(step.id, {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - stepStartTime,
        });
      }

      streamCallback?.({
        type: "step-error",
        step: "search_services",
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        error: error instanceof Error ? error.message : String(error),
        current_step: "format_response",
        steps: [...state.steps, step!],
      };
    }
  }

  /**
   * Node: Get detailed pricing
   */
  private async getPricingNode(
    state: QuoteAgentState,
    config?: any
  ): Promise<Partial<QuoteAgentState>> {
    const streamCallback = config?.streamCallback;
    console.log("💰 [QUOTE_AGENT] Fetching detailed pricing");
    const stepStartTime = Date.now();

    const step = await createStep({
      chat_id: state.chat_id,
      step_type: "format_response",
      step_name: "Getting detailed pricing",
      status: "running",
      started_at: new Date().toISOString(),
      retry_count: 0,
      retryable: true,
    });

    streamCallback?.({
      type: "step-start",
      step: "get_pricing",
      name: "Getting detailed pricing",
    });

    try {
      const searchResults = state.search_results!;
      const allServices = [
        ...searchResults.tours,
        ...searchResults.hotels,
        ...searchResults.transfers,
      ];

      // Limit services to prevent prompt overflow
      const maxServices = 10;
      const limitedServices = allServices.slice(0, maxServices);

      const servicesWithPricing = await this.mcpOperations.fetchServiceDetails(
        limitedServices
      );

      if (step) {
        await updateStep(step.id, {
          status: "completed",
          output: {
            services_priced: servicesWithPricing.length,
            total_services: servicesWithPricing.length,
          },
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - stepStartTime,
        });
      }

      streamCallback?.({
        type: "step-complete",
        step: "get_pricing",
        duration_ms: Date.now() - stepStartTime,
      });

      return {
        services_with_pricing: servicesWithPricing,
        current_step: "format_response",
        steps: [...state.steps, step!],
      };
    } catch (error) {
      console.error("❌ [QUOTE_AGENT] Pricing fetch failed:", error);

      if (step) {
        await updateStep(step.id, {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - stepStartTime,
        });
      }

      streamCallback?.({
        type: "step-error",
        step: "get_pricing",
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        error: error instanceof Error ? error.message : String(error),
        current_step: "format_response",
        steps: [...state.steps, step!],
      };
    }
  }

  /**
   * Node: Format the final quote response
   */
  private async formatQuoteNode(
    state: QuoteAgentState,
    config?: any
  ): Promise<Partial<QuoteAgentState>> {
    const streamCallback = config?.streamCallback;
    console.log("📝 [QUOTE_AGENT] Formatting quote response");
    const stepStartTime = Date.now();

    const step = await createStep({
      chat_id: state.chat_id,
      step_type: "format_response",
      step_name: "Preparing your quote",
      status: "running",
      started_at: new Date().toISOString(),
      retry_count: 0,
      retryable: true,
    });

    streamCallback?.({
      type: "step-start",
      step: "format_quote",
      name: "Preparing your quote",
    });

    try {
      const responseContext = {
        query: state.query,
        parsedIntent: state.parsed_intent,
        services: state.search_results,
        conversationHistory: state.messages?.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      const quoteResponse = await this.responseFormatter.formatResponse(
        responseContext,
        {
          usePricing: true,
          maxServices: 8,
        }
      );

      if (step) {
        await updateStep(step.id, {
          status: "completed",
          output: { response_length: quoteResponse.length },
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - stepStartTime,
        });
      }

      streamCallback?.({
        type: "step-complete",
        step: "format_quote",
        duration_ms: Date.now() - stepStartTime,
      });
      streamCallback?.({ type: "text-complete", content: quoteResponse });

      return {
        quote_response: quoteResponse,
        formatted_response: quoteResponse,
        current_step: "format_response",
        steps: [...state.steps, step!],
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("❌ [QUOTE_AGENT] Quote formatting failed:", error);

      if (step) {
        await updateStep(step.id, {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - stepStartTime,
        });
      }

      streamCallback?.({
        type: "step-error",
        step: "format_quote",
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        error: error instanceof Error ? error.message : String(error),
        current_step: "format_response",
        steps: [...state.steps, step!],
      };
    }
  }

  /**
   * Execute the quote agent workflow
   */
  async invoke(
    input: Partial<QuoteAgentState>,
    streamCallback?: (event: StreamEvent) => void
  ): Promise<QuoteAgentState> {
    console.log("🚀 [QUOTE_AGENT] Starting quote generation workflow");

    try {
      const result = await this.workflow.invoke(input, {
        streamCallback,
      });

      console.log("✅ [QUOTE_AGENT] Quote generation completed");
      return result;
    } catch (error) {
      console.error("❌ [QUOTE_AGENT] Workflow execution failed:", error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Stream the quote agent workflow
   */
  async *stream(
    input: Partial<QuoteAgentState>
  ): AsyncGenerator<any, void, unknown> {
    console.log("🚀 [QUOTE_AGENT] Starting streaming quote generation");

    try {
      yield* this.workflow.stream(input);
    } catch (error) {
      console.error("❌ [QUOTE_AGENT] Streaming workflow failed:", error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get workflow statistics
   */
  getStats() {
    return {
      type: "quote-agent",
      nodes: ["parse_query", "search_services", "get_pricing", "format_quote"],
      capabilities: [
        "Travel service search",
        "Pricing extraction",
        "Quote generation",
        "Professional formatting",
      ],
    };
  }
}

/**
 * Factory function to create quote agent workflow
 */
export function createQuoteAgentWorkflow(): QuoteAgentWorkflow {
  return new QuoteAgentWorkflow();
}

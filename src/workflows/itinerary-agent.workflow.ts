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
 * Itinerary Agent Workflow
 *
 * Specialized workflow for generating travel itineraries.
 * Prioritizes predefined itineraries, falls back to custom generation.
 *
 * Clean, testable, single-responsibility architecture
 */

export interface ItineraryAgentState extends AgentState {
  parsed_intent?: ParsedQueryIntent;
  predefined_itinerary?: any;
  available_services?: any;
  itinerary_response?: string;
}

export class ItineraryAgentWorkflow {
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
   * Build the itinerary agent workflow graph
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
        predefined_itinerary: {
          value: (left?: any, right?: any) => right ?? left,
          default: () => undefined,
        },
        available_services: {
          value: (left?: any, right?: any) => right ?? left,
          default: () => undefined,
        },
        itinerary_response: {
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
    workflow.addNode("check_itinerary", this.checkItineraryNode.bind(this));
    workflow.addNode("search_services", this.searchServicesNode.bind(this));
    workflow.addNode("build_itinerary", this.buildItineraryNode.bind(this));
    workflow.addNode("format_response", this.formatResponseNode.bind(this));

    // Add edges with conditional routing
    (workflow as any).addEdge(START, "parse_query");
    (workflow as any).addEdge("parse_query", "check_itinerary");

    // Conditional routing after checking predefined itineraries
    (workflow as any).addConditionalEdges(
      "check_itinerary",
      (state: any) => {
        const hasPredefined =
          state.predefined_itinerary &&
          !state.predefined_itinerary.error &&
          Object.keys(state.predefined_itinerary).length > 0;

        return hasPredefined ? "format_response" : "search_services";
      },
      {
        format_response: "format_response",
        search_services: "search_services",
      }
    );

    (workflow as any).addEdge("search_services", "build_itinerary");
    (workflow as any).addEdge("build_itinerary", "format_response");
    (workflow as any).addEdge("format_response", END);

    return workflow.compile();
  }

  /**
   * Node: Parse user query
   */
  private async parseQueryNode(
    state: ItineraryAgentState,
    config?: any
  ): Promise<Partial<ItineraryAgentState>> {
    const streamCallback = config?.streamCallback;
    console.log("🔍 [ITINERARY_AGENT] Parsing query for itinerary generation");
    const stepStartTime = Date.now();

    const step = await createStep({
      chat_id: state.chat_id,
      step_type: "parse_query",
      step_name: "Understanding your itinerary request",
      status: "running",
      started_at: new Date().toISOString(),
      retry_count: 0,
      retryable: true,
    });

    streamCallback?.({
      type: "step-start",
      step: "parse_query",
      name: "Understanding your itinerary request",
    });

    try {
      // Skip if already parsed
      if (state.parsed_intent) {
        console.log("🔍 [ITINERARY_AGENT] Using existing parsed intent");
        return {
          parsed_intent: state.parsed_intent,
          current_step: "search_itineraries",
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

      // Validate it's an itinerary request
      if (
        parsedIntent.request_type !== "itinerary" &&
        parsedIntent.request_type !== "general"
      ) {
        throw new Error(
          `This workflow handles itinerary requests, got: ${parsedIntent.request_type}`
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
        current_step: "search_itineraries",
        steps: [...state.steps, step!],
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("❌ [ITINERARY_AGENT] Query parsing failed:", error);

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
   * Node: Check for predefined itineraries
   */
  private async checkItineraryNode(
    state: ItineraryAgentState,
    config?: any
  ): Promise<Partial<ItineraryAgentState>> {
    const streamCallback = config?.streamCallback;
    console.log("🗺️ [ITINERARY_AGENT] Checking for predefined itineraries");
    const stepStartTime = Date.now();

    const step = await createStep({
      chat_id: state.chat_id,
      step_type: "search_itineraries",
      step_name: "Looking for ready-made itineraries",
      status: "running",
      started_at: new Date().toISOString(),
      retry_count: 0,
      retryable: true,
    });

    streamCallback?.({
      type: "step-start",
      step: "check_itinerary",
      name: "Looking for ready-made itineraries",
    });

    try {
      const parsed = state.parsed_intent!;
      const noOfNights = parsed.no_of_nights || 3;

      const predefinedItinerary =
        await this.mcpOperations.getPredefinedItinerary(
          state.dmc_id || "",
          parsed.country_name || parsed.destinations?.[0] || "",
          noOfNights
        );

      let hasPredefined = false;
      if (predefinedItinerary && !predefinedItinerary.error) {
        hasPredefined = true;
        console.log("✅ [ITINERARY_AGENT] Found predefined itinerary");
      } else {
        console.log(
          "ℹ️ [ITINERARY_AGENT] No predefined itinerary found, will create custom"
        );
      }

      if (step) {
        await updateStep(step.id, {
          status: "completed",
          output: { has_predefined_itinerary: hasPredefined },
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - stepStartTime,
        });
      }

      streamCallback?.({
        type: "step-complete",
        step: "check_itinerary",
        duration_ms: Date.now() - stepStartTime,
      });

      return {
        predefined_itinerary: predefinedItinerary,
        current_step: hasPredefined ? "format_response" : "search_tours",
        steps: [...state.steps, step!],
      };
    } catch (error) {
      console.error("❌ [ITINERARY_AGENT] Itinerary check failed:", error);

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
        step: "check_itinerary",
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
   * Node: Search for travel services (when no predefined itinerary)
   */
  private async searchServicesNode(
    state: ItineraryAgentState,
    config?: any
  ): Promise<Partial<ItineraryAgentState>> {
    const streamCallback = config?.streamCallback;
    console.log("🔍 [ITINERARY_AGENT] Searching services for custom itinerary");
    const stepStartTime = Date.now();

    const step = await createStep({
      chat_id: state.chat_id,
      step_type: "search_tours",
      step_name: "Finding activities and services",
      status: "running",
      started_at: new Date().toISOString(),
      retry_count: 0,
      retryable: true,
    });

    streamCallback?.({
      type: "step-start",
      step: "search_services",
      name: "Finding activities and services",
    });

    try {
      const parsed = state.parsed_intent!;
      const searchParams = {
        dmc_id: state.dmc_id || "",
        search_text:
          parsed.search_text || parsed.interests?.join(" ") || state.query,
        country_name: parsed.country_name || parsed.destinations?.[0] || "",
      };

      console.log("🔍 [ITINERARY_AGENT] Search params:", searchParams);

      const searchResults = await this.mcpOperations.searchAllServices(
        searchParams
      );

      // For itineraries, we want a good mix of activities
      const maxServices = 15;
      const allServices = [
        ...searchResults.tours.slice(0, 8),
        ...searchResults.hotels.slice(0, 3),
        ...searchResults.transfers.slice(0, 4),
      ];

      if (step) {
        await updateStep(step.id, {
          status: "completed",
          output: {
            services_found: searchResults.total,
            selected_for_itinerary: allServices.length,
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
        available_services: {
          services: allServices,
          total: allServices.length,
        },
        current_step: "format_response",
        steps: [...state.steps, step!],
      };
    } catch (error) {
      console.error("❌ [ITINERARY_AGENT] Service search failed:", error);

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
   * Node: Build custom itinerary from services
   */
  private async buildItineraryNode(
    state: ItineraryAgentState,
    config?: any
  ): Promise<Partial<ItineraryAgentState>> {
    const streamCallback = config?.streamCallback;
    console.log("🏗️ [ITINERARY_AGENT] Building custom itinerary");
    const stepStartTime = Date.now();

    const step = await createStep({
      chat_id: state.chat_id,
      step_type: "format_response",
      step_name: "Creating your custom itinerary",
      status: "running",
      started_at: new Date().toISOString(),
      retry_count: 0,
      retryable: true,
    });

    streamCallback?.({
      type: "step-start",
      step: "build_itinerary",
      name: "Creating your custom itinerary",
    });

    try {
      const parsed = state.parsed_intent!;
      const availableServices = state.available_services;

      // Build custom itinerary structure
      const noOfNights = parsed.no_of_nights || 3;
      const numPeople = parsed.num_people || 2;

      const customItinerary = {
        type: "custom",
        destination: parsed.country_name || parsed.destinations?.[0],
        duration: noOfNights,
        travelers: {
          adults: numPeople,
          children: parsed.children || [],
        },
        days: this.generateDayStructure(
          availableServices?.services || [],
          noOfNights,
          parsed.interests || []
        ),
        notes: `Custom itinerary built for ${numPeople} travelers for ${noOfNights} nights`,
      };

      if (step) {
        await updateStep(step.id, {
          status: "completed",
          output: { custom_itinerary_built: true },
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - stepStartTime,
        });
      }

      streamCallback?.({
        type: "step-complete",
        step: "build_itinerary",
        duration_ms: Date.now() - stepStartTime,
      });

      return {
        predefined_itinerary: customItinerary,
        current_step: "format_response",
        steps: [...state.steps, step!],
      };
    } catch (error) {
      console.error("❌ [ITINERARY_AGENT] Itinerary building failed:", error);

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
        step: "build_itinerary",
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
   * Generate day structure for custom itinerary
   */
  private generateDayStructure(
    services: any[],
    noOfNights: number,
    interests: string[]
  ): any[] {
    const days = [];

    // Group services by type
    const tours = services.filter((s) => s.type === "tour");
    const transfers = services.filter((s) => s.type === "transfer");
    const hotels = services.filter((s) => s.type === "hotel");

    for (let day = 1; day <= noOfNights + 1; day++) {
      const dayStructure: any = {
        day: day,
        title: this.getDayTitle(day, noOfNights),
        activities: [],
        notes: [],
      };

      // Day 1: Arrival
      if (day === 1) {
        if (transfers.length > 0) {
          dayStructure.activities.push({
            type: "transfer",
            name: transfers[0].name,
            time: "On arrival",
          });
        }
        dayStructure.activities.push({
          type: "check_in",
          name: "Hotel check-in",
          time: "Afternoon",
        });
      }
      // Last day: Departure
      else if (day === noOfNights + 1) {
        dayStructure.activities.push({
          type: "check_out",
          name: "Hotel check-out",
          time: "Morning",
        });
        if (transfers.length > 1) {
          dayStructure.activities.push({
            type: "transfer",
            name: transfers[1].name,
            time: "Before flight",
          });
        }
      }
      // Middle days: Tours and activities
      else {
        const tourIndex = (day - 2) % tours.length;
        if (tours[tourIndex]) {
          dayStructure.activities.push({
            type: "tour",
            name: tours[tourIndex].name,
            time: "Full day",
          });
        } else {
          dayStructure.activities.push({
            type: "free_time",
            name: "Free time for exploration",
            time: "Full day",
          });
        }
      }

      days.push(dayStructure);
    }

    return days;
  }

  /**
   * Get day title based on position
   */
  private getDayTitle(day: number, totalNights: number): string {
    if (day === 1) return "Day 1: Arrival";
    if (day === totalNights + 1) return `Day ${day}: Departure`;
    return `Day ${day}: Exploration`;
  }

  /**
   * Node: Format the final response
   */
  private async formatResponseNode(
    state: ItineraryAgentState,
    config?: any
  ): Promise<Partial<ItineraryAgentState>> {
    const streamCallback = config?.streamCallback;
    console.log("📝 [ITINERARY_AGENT] Formatting itinerary response");
    const stepStartTime = Date.now();

    const step = await createStep({
      chat_id: state.chat_id,
      step_type: "format_response",
      step_name: "Preparing your itinerary",
      status: "running",
      started_at: new Date().toISOString(),
      retry_count: 0,
      retryable: true,
    });

    streamCallback?.({
      type: "step-start",
      step: "format_response",
      name: "Preparing your itinerary",
    });

    try {
      const responseContext = {
        query: state.query,
        parsedIntent: state.parsed_intent,
        services: state.available_services,
        predefinedItinerary: state.predefined_itinerary,
        conversationHistory: state.messages?.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      const itineraryResponse = await this.responseFormatter.formatResponse(
        responseContext,
        {
          usePricing: false,
          maxServices: 12,
        }
      );

      if (step) {
        await updateStep(step.id, {
          status: "completed",
          output: { response_length: itineraryResponse.length },
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - stepStartTime,
        });
      }

      streamCallback?.({
        type: "step-complete",
        step: "format_response",
        duration_ms: Date.now() - stepStartTime,
      });
      streamCallback?.({ type: "text-complete", content: itineraryResponse });

      return {
        itinerary_response: itineraryResponse,
        formatted_response: itineraryResponse,
        current_step: "format_response",
        steps: [...state.steps, step!],
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("❌ [ITINERARY_AGENT] Response formatting failed:", error);

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
        step: "format_response",
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
   * Execute the itinerary agent workflow
   */
  async invoke(
    input: Partial<ItineraryAgentState>,
    streamCallback?: (event: StreamEvent) => void
  ): Promise<ItineraryAgentState> {
    console.log("🚀 [ITINERARY_AGENT] Starting itinerary generation workflow");

    try {
      const result = await this.workflow.invoke(input, {
        streamCallback,
      });

      console.log("✅ [ITINERARY_AGENT] Itinerary generation completed");
      return result;
    } catch (error) {
      console.error("❌ [ITINERARY_AGENT] Workflow execution failed:", error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Stream the itinerary agent workflow
   */
  async *stream(
    input: Partial<ItineraryAgentState>
  ): AsyncGenerator<any, void, unknown> {
    console.log("🚀 [ITINERARY_AGENT] Starting streaming itinerary generation");

    try {
      yield* this.workflow.stream(input);
    } catch (error) {
      console.error("❌ [ITINERARY_AGENT] Streaming workflow failed:", error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get workflow statistics
   */
  getStats() {
    return {
      type: "itinerary-agent",
      nodes: [
        "parse_query",
        "check_itinerary",
        "search_services",
        "build_itinerary",
        "format_response",
      ],
      capabilities: [
        "Predefined itinerary search",
        "Custom itinerary building",
        "Day-by-day planning",
        "Activity recommendations",
        "Smart routing",
      ],
    };
  }
}

/**
 * Factory function to create itinerary agent workflow
 */
export function createItineraryAgentWorkflow(): ItineraryAgentWorkflow {
  return new ItineraryAgentWorkflow();
}

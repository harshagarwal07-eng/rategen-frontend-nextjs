import { z } from "zod";
import { MessagesAnnotation, Annotation } from "@langchain/langgraph";
import {
  RemoveUIMessage,
  UIMessage,
  uiMessageReducer,
} from "@langchain/langgraph-sdk/react-ui/server";

// =====================================================
// CONTENT BLOCK TYPES (LangChain Generative UI Pattern)
// =====================================================

export type ServiceType = "tour" | "hotel" | "transfer" | "combo" | "meal" | "flight";

export interface ServiceCardData {
  id?: string;
  type: ServiceType;
  name: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  rating?: number;
  review_count?: number;
  location?: string;
  price?: number;
  currency?: string;
  showPricing?: boolean;
  duration?: string;
  participants?: number;
  time?: string;
  // Type-specific
  transfer_type?: string;
  vehicle?: string;
  meal_plan?: string;
  room_type?: string;
  basis?: string;
  service_context?: string; // e.g., "From Hotel to Global Village"
}

export interface DayCarouselData {
  day: number;
  date?: string;
  title: string;
  activities: ServiceCardData[];
  overnight?: string;
}

// Content blocks for interleaved streaming
export type ContentBlock =
  | { type: "markdown"; content: string }
  | { type: "day-carousel"; day: number; title: string; activities: ServiceCardData[]; showPricing: boolean; currency: string }
  | { type: "pricing-summary"; content: string };

// Agent Step Status
export const AgentStepStatus = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
]);
export type AgentStepStatus = z.infer<typeof AgentStepStatus>;

// Agent Step Type
export type AgentStepType =
  | "parse_query"
  | "search_tours"
  | "search_hotels"
  | "search_transfers"
  | "search_itineraries"
  | "apply_guardrails"
  | "format_response";

// Agent Step
export interface AgentStep {
  id: string;
  chat_id: string;
  message_id?: string;
  step_type: AgentStepType;
  step_name: string;
  status: AgentStepStatus;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  retry_count: number;
  retryable: boolean;
}

// Generative UI Annotation (following LangGraph SDK pattern)
export const GenerativeUIAnnotation = Annotation.Root({
  messages: MessagesAnnotation.spec["messages"],
  ui: Annotation<
    UIMessage[],
    UIMessage | RemoveUIMessage | (UIMessage | RemoveUIMessage)[]
  >({ default: () => [], reducer: uiMessageReducer }),
  timestamp: Annotation<number>(),
});

// Agent State for LangGraph (updated with UI field)
export interface AgentState {
  messages: Array<{
    role: "user" | "assistant" | "system" | "tool";
    content: string;
  }>;
  ui: UIMessage[];
  query: string;
  model: string;
  // Followup detection
  is_followup?: boolean;
  parsed_intent?: {
    destinations?: string[];
    dates?: string[];
    num_people?: number;
    budget?: string;
    interests?: string[];
    children?: { age: number }[];
    // Intent classification
    request_type?:
      | "itinerary"
      | "quote"
      | "individual_rate"
      | "general"
      | "followup";
    service_type?: "tour" | "hotel" | "transfer";
    service_id?: string;
    country_name?: string; // Extracted from destination
    no_of_nights?: number; // Calculated from dates or duration
    search_text?: string;
    is_followup?: boolean;
  };
  dmc_settings?: {
    price_breakup_rule?: "category_breakup" | "item_breakup" | "total_gross";
    chatdmc_listing?: boolean;
    kill_switch?: boolean;
    allow_individual_service_rates?: boolean;
    [key: string]: any;
  };
  // New MCP results
  default_policies?: any; // Result from DefaultPolicies MCP
  default_travel_theme?: any; // Result from DefaultTravelTheme MCP
  default_sell_policy?: any; // Result from DefaultSellPolicy MCP
  predefined_itinerary?: any; // Result from ItineraryAgent MCP
  services_list?: any[]; // Result from ServicesList MCP
  mcp_results: {
    tours?: any[];
    hotels?: any[];
    transfers?: any[];
    itineraries?: any[];
  };
  filtered_results?: any[];
  formatted_response?: string;
  suggested_actions?: string[]; // AI-generated contextual suggestions
  current_step?: AgentStepType;
  awaiting_confirmation?: boolean;
  confirmed_itinerary?: any;
  error?: string;
  chat_id: string;
  dmc_id?: string;
  total_tokens: number;
  steps: AgentStep[];
  timestamp: number;
}

// LLM Provider Configuration
export interface LLMConfig {
  provider: "gemini" | "openai" | "anthropic";
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey: string;
}

// Token Usage Tracking
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Tool Call Information
export interface ToolCall {
  tool_name: string;
  input: Record<string, any>;
  output?: any;
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
  started_at: number;
  completed_at?: number;
}

// Streaming Event Types (updated with UIMessage and Tool Call support)
export type StreamEvent =
  | { type: "step-start"; step: AgentStepType; name: string }
  | { type: "step-progress"; step: AgentStepType; message: string }
  | { type: "step-complete"; step: AgentStepType; duration_ms: number }
  | { type: "step-error"; step: AgentStepType; error: string }
  | { type: "tool-call-start"; tool: ToolCall }
  | { type: "tool-call-complete"; tool: ToolCall }
  | { type: "tool-call-error"; tool: ToolCall }
  | { type: "text-delta"; content: string }
  | { type: "text-complete"; content: string }
  | { type: "text-chunk"; content: string }
  | { type: "token-usage"; usage: TokenUsage }
  | { type: "ui"; ui: UIMessage[] }
  | { type: "content-block"; block: ContentBlock } // LangChain-style content blocks
  | { type: "suggested-actions"; actions: string[] }
  | { type: "finish" }
  | { type: "error"; error: string }
  // Workflow-specific events
  | { type: "search-results"; hotels: number; tours: number; transfers: number }
  | { type: "service-selected"; service_type: "hotel" | "tour" | "transfer"; name: string }
  | { type: "pricing-calculated"; total: number; currency: string }
  | { type: "metadata"; tokens_used: number; model_used: string; completion_time?: number; ui?: UIMessage[]; version?: number; parent_message_id?: string; contentBlocks?: ContentBlock[]; prompt_tokens?: number; completion_tokens?: number; thinking?: string; steps?: Array<{ id: string; message: string; status: "in_progress" | "completed" }> }
  | { type: "chat-id"; chatId: string; userMessageId?: string }
  // Custom/Itinerary events
  | { type: "CUSTOM"; name: string; data?: { itinerary_data?: unknown; status?: string } }
  | { type: "itinerary-partial"; data: { itinerary_data: unknown; status: string } }
  | { type: "itinerary-complete"; data: { itinerary_data: unknown; status: string } };

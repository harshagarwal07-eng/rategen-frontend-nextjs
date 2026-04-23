/**
 * Travel Agent V2 Types
 *
 * New architecture using direct Supabase queries and pricing utilities
 * Follows anti-hallucination strategy: LLM selects by index, never generates data
 */

import type {
  VwHotelRoom,
  VwToursPackage,
  VwTransfersPackage,
  VwDoc,
  DMCSettings,
} from "@/types/database";
import type { PricingResult } from "@/types/pricing";

// Re-export database types for convenience
export type {
  VwHotelRoom,
  VwToursPackage,
  VwTransfersPackage,
  VwDoc,
  DMCSettings,
};

/**
 * Parsed travel query extracted from natural language
 */
export interface ParsedTravelQuery {
  // Destination
  destination: string; // "Singapore", "Bali", etc.
  country_id?: string; // UUID from countries table

  // Travel dates
  check_in: Date;
  check_out: Date;
  nights: number;

  // Travelers
  adults: number;
  children: { age: number }[];

  // Preferences
  interests?: string[];
  budget_level?: "budget" | "mid-range" | "luxury";

  // Request type
  intent: "quote" | "itinerary" | "search";

  // Query type - determines workflow path
  query_type: "individual_service" | "full_itinerary";

  // Specific service requested (for individual_service queries)
  requested_service?: {
    type: "hotel" | "tour" | "transfer";
    name?: string; // e.g., "Universal Studios"
  };
}

/**
 * Service selection made by LLM
 * LLM selects by index from search results, never generates names
 */
export interface SelectedHotel {
  index: number; // Index in search results array
  hotel_id: string;
  room_id: string;
  check_in: Date;
  check_out: Date;
  justification: string; // Why this hotel was selected
}

export interface SelectedTour {
  index: number; // Index in search results array
  tour_id: string;
  package_id: string;
  date: Date;
  type: "SIC" | "PVT";
  addon_ids: string[];
  justification: string;
}

export interface SelectedTransfer {
  index: number; // Index in search results array
  transfer_id: string;
  package_id: string;
  date: Date;
  type: "SIC" | "PVT";
  justification: string;
}

/**
 * Main state for Travel Agent V2 workflow
 * Follows LangGraph state management pattern
 */
export interface TravelAgentStateV2 {
  // Request info
  query: string;
  chat_id: string;
  message_id?: string;
  dmc_id: string;

  // Conversation history
  conversation_history: Array<{
    role: "user" | "assistant";
    content: string;
  }>;

  // Parsing
  parsed_query?: ParsedTravelQuery;

  // DMC context
  dmc_settings?: DMCSettings;
  sell_policy?: string;
  predefined_itinerary?: VwDoc;

  // Search results (from Supabase)
  hotels: VwHotelRoom[];
  tours: VwToursPackage[];
  transfers: VwTransfersPackage[];

  // LLM selections (by index)
  selected_hotels: SelectedHotel[];
  selected_tours: SelectedTour[];
  selected_transfers: SelectedTransfer[];

  // Pricing calculation
  pricing_result?: PricingResult;

  // Output
  itinerary_markdown?: string;
  suggested_actions?: string[];

  // Error handling
  errors: string[];

  // Workflow tracking
  current_step?: string;
  steps_completed: string[];

  // Metadata
  total_tokens: number;
  timestamp: number;
}

/**
 * Workflow node result
 */
export interface NodeResult {
  state_update: Partial<TravelAgentStateV2>;
  next_node?: string;
  error?: string;
}

/**
 * Streaming events for UI updates
 */
export type TravelAgentEventV2 =
  | { type: "step-start"; step: string; name: string }
  | { type: "step-progress"; step: string; message: string }
  | { type: "step-complete"; step: string; duration_ms: number }
  | { type: "step-error"; step: string; error: string }
  | { type: "search-results"; hotels: number; tours: number; transfers: number }
  | { type: "service-selected"; service_type: "hotel" | "tour" | "transfer"; index: number; name: string }
  | { type: "pricing-calculated"; total: number; currency: string }
  | { type: "text-delta"; content: string }
  | { type: "text-complete"; content: string }
  | { type: "suggested-actions"; actions: string[] }
  | { type: "finish" }
  | { type: "error"; error: string };

/**
 * Service selection prompt for LLM
 * LLM must respond with indices, never names
 */
export interface ServiceSelectionPrompt {
  query: string;
  parsed_query: ParsedTravelQuery;
  hotels: VwHotelRoom[];
  tours: VwToursPackage[];
  transfers: VwTransfersPackage[];
  sell_policy?: string;
}

/**
 * Service selection response from LLM
 * Must use Zod schema for validation
 */
export interface ServiceSelectionResponse {
  hotels: Array<{
    index: number; // Index in hotels array
    check_in: string; // ISO date
    check_out: string; // ISO date
    justification: string;
  }>;
  tours: Array<{
    index: number; // Index in tours array
    date: string; // ISO date
    type: "SIC" | "PVT";
    addon_indices: number[]; // Indices in tour.add_ons array
    justification: string;
  }>;
  transfers: Array<{
    index: number; // Index in transfers array
    date: string; // ISO date
    type: "SIC" | "PVT";
    justification: string;
  }>;
}

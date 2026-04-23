/**
 * Query Classification Types for Travel Agent
 *
 * This file defines the structure for categorizing and processing user queries
 * in the travel agent system.
 */

export enum QueryCategory {
  COMPLETE_QUOTE = "complete_quote",
  TOUR_SERVICE = "tour_service",
  HOTEL_SERVICE = "hotel_service",
  TRANSFER_SERVICE = "transfer_service",
  ATTRACTION_SERVICE = "attraction_service",
  GENERAL = "general", // For follow-up queries, clarifications, modifications
  UNKNOWN = "unknown",
}

export enum TransferType {
  SIC = "sic", // Seat In Coach
  PRIVATE = "private", // Private Rates
  PER_VEHICLE = "per_vehicle", // Per Vehicle Rates
}

export interface TravelQueryInfo {
  category: QueryCategory;
  services: string[];
  destination?: string; // Full country name (e.g., "Singapore")
  destinationCode?: string; // ✅ ISO 2-letter code (e.g., "SG")
  duration?: {
    days?: number;
    nights?: number;
  };
  travelers: {
    adults: number;
    children?: number;
    infants?: number;
    childrenDetails?: { age: number }[]; // ✅ Preserve individual ages for capacity validation
  };
  dates?: {
    startDate?: string;
    endDate?: string;
    flexible?: boolean;
  };
  preferences?: {
    budget?: {
      min?: number;
      max?: number;
      currency?: string;
    };
    accommodationType?: string[];
    transportType?: TransferType[];
    mealPlan?: string[];
    activities?: string[];
    transferBasis?: "SIC" | "Private" | null; // ✅ User's explicit preference for SIC/PVT
  };
  specificRequests?: {
    hotels?: string[];
    room_category?: string; // ✅ Specific room type (e.g., "Deluxe Sea View", "Garden Family Bungalow")
    attractions?: string[];
    transfers?: {
      origin?: string;
      destination?: string;
      type?: string;
    };
  };
  // ✅ User's requested meal plan (e.g., "Full Board", "Half Board", "All Inclusive")
  meal_plan?: string;
  // ✅ Early check-in/late checkout times (24-hour format, e.g., "07:30", "18:00")
  early_checkin?: string;
  late_checkout?: string;
  transferIncluded?: boolean;
  ticketsOnly?: boolean;
  isDetailedItinerary?: boolean;
  is_followup?: boolean; // ✅ LLM detected this as a followup to previous message
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  userSelectedModel?: string;

  // ✅ Multi-option request for comparing multiple hotels
  multi_option_request?: {
    count_per_star_rating?: { [rating: string]: number }; // e.g., {"4": 2, "5": 2}
    total_options_requested?: number;
  };

  // ✅ Split stay structure for different room types across nights
  split_stay?: {
    splits: Array<{
      room_type: string; // e.g., "beach villa", "water villa"
      nights: number;
    }>;
  };

  // ✅ Extracted services with names for vector search (LLM-extracted)
  extracted_services?: Array<{
    name: string;
    type: "hotel" | "tour" | "transfer";
  }>;
}

export interface DMCSettings {
  id: string;
  // DMC Profile Info (for templates)
  name?: string;
  streetAddress?: string;
  city?: string;
  country?: string;
  website?: string;
  // Settings
  pricing_breakup_rule?: string;
  output_currency?: string;
  allow_individual_service_rates: boolean;
  countryServing?: string[]; // ✅ Countries this DMC serves (e.g., ["SG", "MU"])
  kill_switch?: boolean;
  // Policies
  default_sell_policy?: string | null;
  default_hotel_policy?: string | null;
  default_tour_policy?: string | null;
  default_transfer_policy?: string | null;
  default_travel_theme?: string | null; // ✅ Travel theme policy (couple, family, etc.)
}

export interface PolicyValidation {
  allowed: boolean;
  policy: string;
  restrictions?: string[];
  message?: string;
  reasoning?: string; // ✅ LLM reasoning for why policy blocked/allowed
  suggestions?: string[]; // ✅ LLM suggestions for user
  usage?: { total_tokens: number }; // ✅ Token usage from LLM evaluation
}

export interface ServiceRateQuery {
  service: string;
  destination: string;
  adults: number;
  children?: number;
  transferType?: TransferType;
  transferIncluded?: boolean;
  ticketsOnly?: boolean;
  specificHotels?: string[];
  room_category?: string; // ✅ Specific room type for hotel queries
  specificAttractions?: string[];
  dates?: {
    startDate: string;
    endDate: string;
  };
}

export interface ItineraryDay {
  day: number;
  date?: string;
  activities: {
    time?: string;
    activity: string;
    package?: string;
    hotelRoom?: string;
    duration?: string;
    notes?: string;
  }[];
}

export interface GeneratedItinerary {
  destination: string;
  totalDays: number;
  totalNights: number;
  days: ItineraryDay[];
  packageNames: string[];
  hotelRoomNames: string[];
  estimatedBudget?: {
    min: number;
    max: number;
    currency: string;
  };
  notes?: string[];
  usage?: { total_tokens: number }; // ✅ Token usage from LLM generation
}

export interface RateQuote {
  query: ServiceRateQuery;
  services: any[];
  totalCost: {
    min: number;
    max: number;
    currency: string;
  };
  recommendations?: string[];
}

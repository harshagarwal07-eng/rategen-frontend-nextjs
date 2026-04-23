/**
 * Itinerary Types
 *
 * Proper TypeScript interfaces for itinerary data
 * to replace `any` types throughout the codebase.
 */

/**
 * Service types available in itineraries
 */
export type ServiceType = "tour" | "hotel" | "transfer" | "combo" | "meal" | "flight";

/**
 * Traveler information for pricing
 */
export interface TravelerInfo {
  adults: number;
  children: number;
  children_ages?: number[];
  infants?: number;
}

/**
 * Individual service/activity in an itinerary day
 */
export interface ItineraryService {
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
  // Type-specific fields
  transfer_type?: string;
  vehicle?: string;
  meal_plan?: string;
  room_type?: string;
  basis?: string;
  // Package/DB references
  package_id?: string;
  hotel_id?: string;
  tour_id?: string;
  transfer_id?: string;
}

/**
 * Single day in an itinerary
 */
export interface ItineraryDay {
  day: number;
  date?: string;
  title: string;
  activities: ItineraryService[];
  overnight?: string;
  notes?: string;
}

/**
 * Complete itinerary data structure
 */
export interface ItineraryData {
  /** Destination name (e.g., "Singapore") */
  destination: string;
  /** ISO country code (e.g., "SG") */
  destination_code: string;
  /** Check-in date (YYYY-MM-DD) */
  check_in: string;
  /** Check-out date (YYYY-MM-DD) */
  check_out: string;
  /** Total days in itinerary */
  total_days: number;
  /** Day-by-day breakdown */
  days: ItineraryDay[];
  /** Traveler information */
  travelers?: TravelerInfo;
  /** Additional notes */
  notes?: string;
  /** Whether pricing has been calculated */
  pricing_calculated?: boolean;
  /** Travel theme (e.g., "honeymoon", "family", "adventure") */
  theme?: string;
}

/**
 * Chat itinerary record (from database)
 */
export interface ChatItinerary {
  id: string;
  chat_id: string;
  destination: string;
  destination_code: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  children_ages: number[];
  hotel_id?: string;
  room_id?: string;
  tour_selections?: unknown[];
  transfer_selections?: unknown[];
  combo_selections?: unknown[];
  itinerary_data: ItineraryData | null;
  status: "draft" | "confirmed" | "completed";
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Itinerary update payload for saving changes
 */
export interface ItineraryUpdatePayload {
  destination?: string;
  destination_code?: string;
  check_in?: string;
  check_out?: string;
  nights?: number;
  adults?: number;
  children?: number;
  children_ages?: number[];
  itinerary_data?: ItineraryData;
  status?: "draft" | "confirmed" | "completed";
}

/**
 * Pricing breakdown for an itinerary
 */
export interface ItineraryPricing {
  hotel_total?: number;
  tour_total?: number;
  transfer_total?: number;
  meal_total?: number;
  grand_total: number;
  currency: string;
  per_person?: number;
  breakdown?: PricingLineItem[];
}

/**
 * Individual pricing line item
 */
export interface PricingLineItem {
  service_type: ServiceType;
  service_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  currency: string;
  notes?: string;
}

/**
 * Type guard to check if data is valid ItineraryData
 */
export function isItineraryData(data: unknown): data is ItineraryData {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.destination === "string" &&
    typeof obj.destination_code === "string" &&
    Array.isArray(obj.days)
  );
}

/**
 * Type guard to check if data is a valid ChatItinerary
 */
export function isChatItinerary(data: unknown): data is ChatItinerary {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.chat_id === "string" &&
    typeof obj.destination === "string"
  );
}

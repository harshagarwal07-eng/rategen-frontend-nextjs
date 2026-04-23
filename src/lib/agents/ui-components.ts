/**
 * UI Component Types for Itinerary Display
 *
 * These types are used by the playground UI components to render
 * itinerary data from the backend pipeline.
 */

// =====================================================
// PRICING BREAKUP RULE
// =====================================================

export type PricingBreakupRule = "total_gross" | "item_breakup" | "hidden";

// =====================================================
// ENHANCED ITINERARY TYPES
// =====================================================

export interface EnhancedItineraryActivity {
  id?: string;
  time: string;
  activity: string;
  package_name?: string;
  package_type: "hotel" | "tour" | "transfer" | "combo" | "meal" | "other";
  status?: "placeholder" | "mapped" | "quantified" | "priced";

  // IDs
  hotel_id?: string;
  room_id?: string;
  tour_id?: string;
  transfer_id?: string;
  package_id?: string;

  // Transfer specific
  zone?: string;
  basis?: string;
  service_context?: string; // e.g., "From Hotel to Global Village"
  vehicle_type?: string;

  // Hotel specific
  hotel_name?: string;
  room_category?: string;
  location?: string;
  rating?: number;
  review_count?: number;
  meal_plan?: string;

  // Tour specific
  description?: string;
  duration?: string;

  // Combo specific
  requested_items?: string[];

  // Images
  image_url?: string;

  // Pricing
  pricing?: {
    subtotal?: number;
    unit_rate?: number;
  };

  // Quantity
  quantity?: {
    adults?: number;
    children?: number;
    total_eligible?: number;
    total_passengers?: number;
  };
}

export interface EnhancedItineraryDayData {
  day: number;
  date?: string;
  title: string;
  activities: EnhancedItineraryActivity[];
}

// =====================================================
// PACKAGE CARD TYPES
// =====================================================

export interface HotelCardProps {
  name: string;
  location?: string;
  rating?: number;
  room_category?: string;
  meal_plan?: string;
  check_in?: string;
  check_out?: string;
  nights?: number;
  image_url?: string;
}

export interface TourCardProps {
  name: string;
  description?: string;
  location?: string;
  duration?: string;
  participants?: number;
  image_url?: string;
}

export interface TransferCardProps {
  name: string;
  type?: string;
  service_context?: string;
  vehicle?: string;
  passengers?: number;
  image_url?: string;
}

export interface ComboCardProps {
  name: string;
  items?: string[];
  participants?: number;
  image_url?: string;
}

export interface PackageCardsProps {
  hotels?: HotelCardProps[];
  tours?: TourCardProps[];
  transfers?: TransferCardProps[];
  combos?: ComboCardProps[];
}

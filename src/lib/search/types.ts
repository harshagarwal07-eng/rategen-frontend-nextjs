/**
 * Shared Search Types
 *
 * Type definitions for all search utilities used by the itinerary pipeline.
 * These types are shared between the new micro-agent architecture and
 * can be used by both the old system (during migration) and the new pipeline.
 */

import type { VwHotelRoom, VwToursPackage, VwTransfersPackage } from "@/types/database";

// =====================================================
// COMMON SEARCH OPTIONS
// =====================================================

export interface SearchOptions {
  limit?: number;
  similarityThreshold?: number;
  userSelectedModel?: string;
}

// =====================================================
// HOTEL SEARCH TYPES
// =====================================================

export interface HotelSearchResult {
  hotel_id: string;
  hotel_name: string;
  hotel_code: string | null;
  hotel_city: string;
  hotel_country: string;
  hotel_address: string | null;
  star_rating: string | null;
  property_type: string | null;
  preferred: boolean;
  similarity: number;
}

export interface RoomSearchResult {
  room_id: string;
  hotel_id: string;
  hotel_name: string;
  room_category: string;
  meal_plan: string;
  max_occupancy: string;
  stop_sale: string | null;
}

export interface HotelSelection {
  hotel_id: string;
  hotel_name: string;
  room_id: string;
  room_category: string;
  meal_plan: string;
  capacity_note?: string;
  check_in?: string;
  check_out?: string;
  nights?: number;
  rate_data?: VwHotelRoom;
  is_available?: boolean;
  availability_note?: string;
  star_rating?: number;
  room_splits?: RoomSplit[];
}

export interface RoomSplit {
  room_id: string;
  room_category: string;
  nights: number;
  rate_per_night?: number;
  rate_data?: VwHotelRoom | RoomSearchResult;
}

// =====================================================
// TOUR SEARCH TYPES
// =====================================================

export interface TourSearchResult {
  package_id: string;
  package_name: string;
  tour_id: string;
  tour_name: string;
  description: string | null;
  package_remarks: string | null;
  includes_transfer: boolean;
  preferred: boolean;
  iscombo: boolean;
  duration: { days?: number; hours?: number; minutes?: number } | null;
  city: string;
  country: string;
  currency: string;
  similarity: number;
}

export interface TourDuration {
  days?: number;
  hours?: number;
  minutes?: number;
}

export interface OperationalHour {
  day: string;
  time_start: string;
  time_end: string;
}

export interface TourSelection {
  tour_id: string;
  tour_name: string;
  package_id: string;
  package_name: string;
  transfer_type: "SIC" | "Private" | "Per Vehicle";
  includes_transfer: boolean;
  assigned_day?: number;
  duration?: TourDuration;
  operational_hours?: OperationalHour[];
  rate_data?: VwToursPackage;
  sic_not_available_reason?: string;
}

// =====================================================
// TRANSFER SEARCH TYPES
// =====================================================

export interface TransferSearchResult {
  package_id: string;
  package_name: string;
  transfer_id: string;
  transfer_name: string;
  description: string | null;
  package_remarks: string | null;
  route: string | null;
  origin: string | null;
  destination: string | null;
  mode: string | null;
  preferred: boolean;
  iscombo: boolean;
  duration: { days?: number; hours?: number; minutes?: number } | null;
  city: string;
  country: string;
  currency: string | null;
  similarity: number;
}

export interface TransferSelection {
  transfer_id: string;
  transfer_name: string;
  package_id: string;
  package_name: string;
  route: string | null;
  vehicle_type: string;
  assigned_day?: number;
  rate_data?: VwTransfersPackage;
}

// =====================================================
// COMBO SEARCH TYPES
// =====================================================

export interface ComboSearchResult {
  combo_id: string;
  title: string;
  description: string | null;
  remarks: string | null;
  country_code: string | null;
  item_count: number;
  package_names: string | null;
  similarity_score: number;
  combo_type: "AND" | "OR";
  min_packages: number;
  max_packages?: number;
}

export interface ComboItem {
  item_id: string;
  item_type: "tour" | "transfer";
  tour_id: string | null;
  transfer_id: string | null;
  tour_package_id: string | null;
  transfer_package_id: string | null;
  package_name: string;
  order: number;
}

export interface ComboSeason {
  season_id: string;
  dates: string | null;
  blackout_dates: string | null;
  exception_rules: string | null;
  order: number;
  ticket_only_rate_adult: number | null;
  ticket_only_rate_child: number | null;
  ticket_only_rate_teenager: number | null;
  ticket_only_rate_infant: number | null;
  sic_rate_adult: number | null;
  sic_rate_child: number | null;
  sic_rate_teenager: number | null;
  sic_rate_infant: number | null;
  pvt_rate: Record<string, unknown> | null;
  per_vehicle_rate: Record<string, unknown>[] | null;
  total_rate: number | null;
}

export interface ComboFullDetails {
  combo_id: string;
  title: string;
  description: string | null;
  remarks: string | null;
  age_policy: Record<string, unknown> | null;
  currency: string;
  dmc_id: string;
  country_code: string | null;
  country_name: string | null;
  city_name: string | null;
  items: ComboItem[];
  seasons: ComboSeason[];
  item_count: number;
  package_names_display: string | null;
  created_at: string;
  updated_at: string;
  combo_type: "AND" | "OR";
  min_packages: number;
  max_packages?: number;
}

export interface ComboSelection {
  combo_id: string;
  title: string;
  description: string | null;
  package_names: string | null;
  item_count: number;
  rate_data?: ComboFullDetails;
  combo_type: "AND" | "OR";
  min_packages: number;
  max_packages?: number;
}

// =====================================================
// LLM SELECTION TYPES
// =====================================================

export interface LLMSelectionResult<T> {
  selection: T | null;
  alternatives: T[];
  reasoning: string;
  tokens_used: number;
}

export interface SelectionContext {
  query: string;
  party_size?: string;
  destination?: string;
  check_in_date?: string;
  nights?: number;
  transfer_basis?: "SIC" | "Private";
  tour_basis?: "SIC" | "Private";
  conversation_history?: Array<{ role: string; content: string }>;
  requested_room_category?: string; // ✅ NEW: User's explicit room preference (e.g., "Beach Pavilion")
}

/**
 * Database View Types
 *
 * TypeScript types matching Supabase database views:
 * - vw_hotel_rooms
 * - vw_tours_packages
 * - vw_transfers_packages
 * - vw_docs
 * - dmcs table
 */

// ========================================
// Hotel Types (vw_hotel_rooms)
// ========================================

export interface HotelSeasonDB {
  dates: string; // "01 Nov 25 - 21 Nov 25" or "All Season"
  rate_per_night: number;
  single_pp: number;
  double_pp: number;
  child_no_bed: number;
  extra_bed_pp: number;
}

export interface VwHotelRoom {
  // Room fields
  id: string;
  hotel_id: string;
  room_category: string;
  meal_plan: string;
  max_occupancy: string; // "[2A + 3C] or [2A + 2Teens]"
  other_details: string | null;
  stop_sale: string | null; // Date ranges when room is unavailable
  seasons: HotelSeasonDB[]; // JSONB array

  // Hotel fields (joined)
  hotel_name: string;
  hotel_code: string | null;
  hotel_address: string | null;
  hotel_country: string;  // Location name (view joins to get name, not UUID)
  hotel_city: string;     // Location name (view joins to get name, not UUID)
  hotel_phone: string | null;
  hotel_email: string | null;
  hotel_description: string | null;
  hotel_currency: string;
  examples: string | null;
  remarks: string | null;
  cancellation_policy: string | null;
  payment_policy: string | null;
  group_policy: string | null; // Group booking policy
  property_type: string | null;
  star_rating: string | null;  // TEXT in DB (e.g., "5 star", "4 star")
  preferred: boolean;
  markup: number | null;  // SMALLINT in DB
  offers: string | null;
  dmc_id: string;

  // Pricing policy fields
  meal_plan_rates: any;  // JSONB - can be object or string
  age_policy: any;       // JSONB - can be object or string
  extra_bed_policy: string | null; // Text with sharing rules and extra bed charges
}

// ========================================
// Tour Types (vw_tours_packages)
// ========================================

export interface TourVehicleDB {
  vehicle_type: string; // "Sedan", "Van", "Coach"
  capacity: string; // "3", "10", "20"
  rate: number;
  brand: string;
}

export interface TourSeasonDB {
  dates: string; // "All Season" or date ranges
  order: number;
  sic_rate_adult: number;
  sic_rate_child: number;
  pvt_rate: Record<string, unknown>; // Usually {}
  per_vehicle_rate: TourVehicleDB[];
  includes_transfer: boolean;
}

export interface TourAddonDB {
  id: string;
  name: string;
  ticket_only_rate_adult: number;
  ticket_only_rate_child: number;
}

export interface TourDurationDB {
  days?: number;
  hours?: number;
  minutes?: number;
}

export interface TourOperationalHourDB {
  day: string; // "Monday", "Tuesday", etc.
  time_start: string; // "09:00"
  time_end: string; // "17:00"
}

export interface VwToursPackage {
  // Package fields
  id: string;
  tour_id: string;
  package_name: string;
  seasons: TourSeasonDB[]; // JSONB array
  package_description: string | null;
  package_remarks: string | null;
  package_child_policy: string | null;
  package_preferred: boolean;
  iscombo: boolean;
  includes_transfer?: boolean;

  // Age policy for eligibility checks
  age_policy?: {
    adult?: { min_age: number; max_age: number };
    teenager?: { min_age: number; max_age: number };
    child?: { min_age: number; max_age: number };
    infant?: { min_age: number; max_age: number };
  } | string; // May come as JSON string from DB

  // Additional fields from RPC
  max_participants?: number;
  notes?: string;
  meeting_point?: string;
  pickup_point?: string;
  dropoff_point?: string;
  inclusions?: string;
  exclusions?: string;

  // Duration & Operational Hours
  duration?: TourDurationDB | string; // JSONB - may come as string from DB
  operational_hours?: TourOperationalHourDB[] | string; // JSONB array - may come as string

  // Tour fields (joined)
  tour_name: string;
  tour_description: string | null;
  tour_remarks: string | null;
  cancellation_policy: string | null;
  tour_child_policy: string | null;
  tour_preferred: boolean;
  markup: string | null;
  currency: string;
  country: string;
  city: string;
  formatted_address: string | null;
  types: string | null;
  dmc_id: string;
  examples: string | null;

  // Addons (aggregated)
  add_ons: TourAddonDB[]; // JSONB array
}

// ========================================
// Transfer Types (vw_transfers_packages)
// ========================================

export interface TransferVehicleDB {
  vehicle_type?: string;
  capacity: string; // "3", "6", "10"
  rate: number;
  brand?: string;
}

export interface TransferSeasonDB {
  dates: string; // "All Season" or date ranges
  order?: number;
  sic_rate_adult: number;
  sic_rate_child: number;
  pvt_rate: Record<string, unknown>; // Usually {}
  per_vehicle_rate: TransferVehicleDB[];
}

export interface VwTransfersPackage {
  // Package fields
  id: string;
  transfer_id: string;
  package_name: string;
  seasons: TransferSeasonDB[]; // JSONB array
  package_description: string | null;
  package_remarks: string | null;
  package_child_policy: string | null;
  package_preferred: boolean;
  iscombo: boolean;

  // Transfer fields (joined)
  transfer_name: string;
  transfer_description: string | null;
  mode: string | null; // "van", "sedan", etc.
  transfer_preferred: boolean;
  markup: string | null;
  rule: string | null;
  raw_rates: string | null;
  transfer_child_policy: string | null;
  cancellation_policy: string | null;
  transfer_remarks: string | null;
  currency: string;
  country: string;
  city: string;
  examples: string | null;
  route: string | null;
  dmc_id: string;
}

// ========================================
// Docs Types (vw_docs)
// ========================================

export type DocType =
  | 'itineraries'
  | 'knowledgebase'
  | 'notes'
  | 'cancellation'
  | 'important-information'
  | 'sample-quotation';

export type ServiceType =
  | 'sell_policy'
  | 'transfers'
  | 'hotels'
  | 'travel_theme'
  | null;

export interface VwDoc {
  id: number;
  created_at: string;
  created_by: string;
  dmc_id: string;
  is_active: boolean;
  content: string; // HTML or text
  type: DocType;
  service_type: ServiceType;
  country: string | null; // UUID
  country_name: string | null;
  country_code: string | null;
  nights: number | null; // Only for itineraries
}

// ========================================
// DMC Settings (dmcs table)
// ========================================

export type PricingBreakupRule =
  | 'total_gross'
  | 'category_breakup'
  | 'item_breakup';

export interface DMCSettings {
  id: string;
  name: string;
  admin_id: string;
  country_id: string | null;
  city_id: string | null;
  pricing_breakup_rule: PricingBreakupRule | null;
  output_currency: string | null;
  chatdmc_listing: boolean | null;
  kill_switch: boolean | null;
  allow_individual_service_rates: boolean | null; // Allow sharing individual service pricing
}

// ========================================
// Helper Types for Queries
// ========================================

export interface SearchHotelsFilters {
  star_rating_min?: number;
  star_rating_max?: number;
  preferred_only?: boolean;
  budget_max?: number;
}

export interface SearchToursFilters {
  interests?: string[];
  preferred_only?: boolean;
  duration_min?: number;
  duration_max?: number;
}

export interface SearchTransfersFilters {
  route?: string;
  mode?: string;
  preferred_only?: boolean;
}

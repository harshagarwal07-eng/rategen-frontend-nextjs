import { KeyValue } from "./common";

// Age policy structure
export type AgePolicy = {
  infant?: {
    min_age: number;
    max_age: number;
    rates?: {
      ticket_only?: number;
      sic?: number;
      pvt?: number;
    };
  };
  child?: {
    min_age: number;
    max_age: number;
    rates?: {
      ticket_only?: number;
      sic?: number;
      pvt?: number;
    };
  };
  teenager?: {
    min_age: number;
    max_age: number;
    rates?: {
      ticket_only?: number;
      sic?: number;
      pvt?: number;
    };
  };
  adult?: {
    min_age: number;
    rates?: {
      ticket_only?: number;
      sic?: number;
      pvt?: number;
    };
  };
};

// Operational hours structure
export type OperationalHours = {
  day: string; // "Monday", "Tuesday", etc.
  time_start: string; // "09:00"
  time_end: string; // "17:00"
};

export type TourSeason = {
  dates?: string; // Simple string like "All Season" or "Current - Oct 31"
  ticket_only_rate_adult?: number;
  ticket_only_rate_child?: number;
  sic_rate_adult?: number;
  sic_rate_child?: number;
  pvt_rate?: Record<string, number>;
  per_vehicle_rate?: Array<{
    rate?: number;
    brand?: string;
    capacity?: string;
    vehicle_type?: string;
  }>;
  exception_rules?: string; // Exception rules for this season
  includes_transfer?: boolean; // Whether transfer is included
  order?: number;
  blackout_dates?: string; // Blackout dates for this season
  total_rate?: number; // New "Total" rate field
};

// Duration structure (JSONB)
export type Duration = {
  days?: number;
  hours?: number;
  minutes?: number;
};

export type TourPackage = {
  id: string;
  created_at?: string;
  updated_at?: string;
  tour_id: string;
  name: string;
  description?: string;
  remarks?: string; // AI will refer to this
  child_policy?: string; // Kept for backward compatibility
  preferred?: boolean;
  iscombo?: boolean;
  order?: number;
  seasons: TourSeason[];
  // New package-level fields
  notes?: string; // For frontend and vouchers
  inclusions?: string; // What's included
  exclusions?: string; // What's excluded
  age_policy?: AgePolicy; // Adult/Child/Infant age ranges and rates
  max_participants?: number; // Maximum participants
  images?: string[]; // Package-specific images (S3 URLs)
  meeting_point?: string; // Meeting point details
  pickup_point?: string; // Pick-up point details
  dropoff_point?: string; // Drop-off point details
  duration?: Duration; // JSONB: {days, hours, minutes}
  operational_hours?: OperationalHours[]; // Array of day/time pairs
  // Virtual field populated from mapping table with full add-on details
  selected_add_ons?: Array<{
    id: string;
    name: string;
    ticket_only_rate_adult?: number;
    ticket_only_rate_child?: number;
    is_mandatory?: boolean; // Whether add-on is mandatory
  }>;
  tour_package_datastore_id: string | null;
  is_unlinked: boolean;
};

export type TourAddOn = {
  id: string;
  created_at?: string;
  updated_at?: string;
  tour_id: string;
  name: string;
  description?: string; // 1 line description
  age_policy?: AgePolicy; // Same as packages: adult/child/infant age ranges
  remarks?: string; // AI will refer to this
  notes?: string; // For frontend and vouchers
  ticket_only_rate_adult?: number;
  ticket_only_rate_child?: number;
  ticket_only_rate_infant?: number;
  ticket_only_rate_teenager?: number;
  total_rate?: number; // Total rate column
  max_participants?: number; // Maximum participants
  images?: string[]; // Add-on images (S3 URLs)
  tour_add_on_datastore_id?: string | null;
  is_unlinked?: boolean;
};

export type Tour = {
  id: string;
  created_at: string;
  tour_name: string;
  ticket_only_rate_adult: number;
  ticket_only_rate_child: number;
  sic_rate_adult: number;
  sic_rate_child: number;
  pvt_rate: KeyValue;
  raw_rates: string;
  description: string;
  remarks: string; // AI will refer to this
  cancellation_policy: string;
  preferred: boolean;
  markup: string;
  currency: string;
  rule: string;
  ticket_only_rate: string;
  sic_rate: string;
  images: string[]; // Tour images (S3 URLs)
  examples: string;
  // New tour-level fields
  notes?: string; // For frontend and vouchers
  packages?: TourPackage[]; // Tour packages with seasons
  add_ons?: TourAddOn[]; // Available add-ons for this tour
  tour_datastore_id: string | null;
  is_unlinked: boolean;
};

// ─────────────────────────────────────────────────────────────────────────
// New module (NestJS-backed). Coexists with the legacy Supabase-direct
// `Tour` shape above; do not merge — they map to different tables.
// Mirrors `frontend/src/types/transfers.ts` shape; renames per backend
// migration 058 (geo_id, primary_geo_id, source_primary_geo_id).
// ─────────────────────────────────────────────────────────────────────────

export type TourStatus =
  | "draft"
  | "active"
  | "inactive"
  | "published"
  | "archived";

export type TourPackageCategory =
  | "attraction"
  | "activity"
  | "combo"
  | "day_trip"
  | "multi_day";

export type TourPackageSalesMode =
  | "ticket"
  | "shared"
  | "private"
  | "exclusive";

export type TourTransferCoverage = "none" | "pickup_dropoff" | "disposal";

export type TourPackageRateMode = "per_pax" | "per_vehicle" | "total" | null;

export interface TourListRow {
  id: string;
  name: string;
  status: TourStatus | string;
  country_id: string | null;
  currency_id: string | null;
  markup_pct: number | null;
  is_preferred?: boolean;
  created_at: string;
}

export interface TourCreateInput {
  name: string;
  country_id: string | null;
  currency_id: string | null;
  description: string | null;
  status: TourStatus;
  is_preferred?: boolean;
}

export type TourUpdateInput = Partial<TourCreateInput> & {
  geo_id?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export interface TourCreated {
  id: string;
  [key: string]: unknown;
}

export interface TourImageRow {
  id: string;
  tour_id: string;
  url: string;
  caption?: string | null;
  sort_order?: number | null;
  created_at?: string;
}

export interface TourCountryOption {
  id: string;
  country_code: string;
  country_name: string;
  is_active?: boolean;
}

export interface TourCurrencyOption {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
}

// Shape returned by GET /api/tours/:id — the row plus nested arrays.
export interface TourDetail extends TourListRow {
  description?: string | null;
  geo_id?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tour_images?: TourImageRow[];
  tour_addons?: unknown[];
  tour_packages?: unknown[];
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────
// Tab 2 — Packages
// ─────────────────────────────────────────────────────────────────────────

export interface TourOperationalHour {
  day_of_week: string; // "Monday", "Tuesday", etc.
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  slots: string[] | null;
}

export interface TourLinkedPackage {
  id?: string;
  combo_package_id?: string;
  linked_type: "tour" | "transfer" | "free_text" | string;
  linked_tour_package_id: string | null;
  linked_transfer_package_id: string | null;
  geo_id: string | null;
  free_text_name: string | null;
  sort_order: number;
  linked_tour_package?: { id: string; name: string; sales_mode: string } | null;
  linked_transfer_package?: { id: string; name: string; service_type: string } | null;
  location?: { id: string; city_name: string; type?: string } | null;
}

export interface TourComboLocation {
  pool_item_id: string;
  geo_id: string | null;
  source_primary_geo_id?: string | null;
  location?: { id: string; city_name: string; type?: string } | null;
}

export interface TourMasterCatalogItem {
  id: string;
  name: string;
  kind: "venue" | "activity" | string;
  geo_id: string | null;
  parent_id?: string | null;
  typical_duration_min?: number | null;
}

export interface TourItineraryDay {
  id?: string;
  day_number: number;
  origin_city_id: string | null;
  destination_city_id: string | null;
  description: string | null;
  origin_city?: { id: string; city_name: string } | null;
  destination_city?: { id: string; city_name: string } | null;
}

export interface TourCancellationRule {
  id?: string;
  days_from: number;
  days_to: number;
  anchor: string;
  charge_type: string;
  charge_value: number;
  is_no_show: boolean;
}

export interface TourCancellationPolicy {
  id?: string;
  package_id?: string;
  is_non_refundable: boolean;
  tour_cancellation_rules?: TourCancellationRule[];
}

export interface TourPackageComponent {
  id?: string;
  master_catalog_id: string;
  sort_order: number;
  master_catalog?: TourMasterCatalogItem;
}

export interface TourPackageAddonLink {
  id?: string;
  addon_id: string;
  package_id?: string;
  is_mandatory: boolean;
}

export interface TourPackageDetail {
  id: string;
  tour_id: string;
  dmc_id?: string;
  name: string;
  category: TourPackageCategory;
  description: string | null;
  sales_mode: TourPackageSalesMode;
  transfer_coverage: TourTransferCoverage;
  combo_mode: string | null;
  combo_count: number | null;
  combo_applicability: string | null;
  dismissed_combo_ids: string[] | null;
  primary_geo_id: string | null;
  duration_days: number;
  duration_hours: number;
  duration_minutes: number;
  min_pax: number | null;
  max_participants: number | null;
  meeting_point: string | null;
  pickup_point: string | null;
  dropoff_point: string | null;
  inclusions: string | null;
  exclusions: string | null;
  is_preferred: boolean;
  is_multi_day: boolean;
  status: string;
  sort_order: number;
  confirmation_type: string | null;
  guide_language: string | null;
  master_template_id: string | null;
  booking_cutoff_hours: number | null;
  rate_mode: TourPackageRateMode;
  created_at?: string;
  updated_at?: string;
  tour_operational_hours?: TourOperationalHour[];
  tour_package_age_policies?: TourAgePolicyBand[];
  tour_package_itinerary_days?: TourItineraryDay[];
  tour_cancellation_policies?: TourCancellationPolicy[];
  tour_package_addons?: TourPackageAddonLink[];
  tour_package_components?: TourPackageComponent[];
  tour_package_taxes?: TourPackageTax[];
  tour_package_images?: TourImageRow[];
}

export type TourPackageCreateInput = Partial<
  Omit<
    TourPackageDetail,
    | "id"
    | "tour_id"
    | "created_at"
    | "updated_at"
    | "tour_operational_hours"
    | "tour_package_age_policies"
    | "tour_package_itinerary_days"
    | "tour_cancellation_policies"
    | "tour_package_addons"
    | "tour_package_components"
    | "tour_package_taxes"
    | "tour_package_images"
  >
> & { name?: string };

// ─────────────────────────────────────────────────────────────────────────
// Tab 3 — Seasons & Rates
// ─────────────────────────────────────────────────────────────────────────

export type TourDiscountType = "percent" | "fixed";

export type TourVehicleRateType = "per_vehicle" | "per_hour" | "per_km";

export interface TourSeasonDateRange {
  id?: string;
  season_id?: string;
  valid_from: string; // ISO date
  valid_till: string; // ISO date
}

export interface TourSeasonBlackoutDate {
  id?: string;
  season_id?: string;
  blackout_date: string; // ISO date
}

export interface TourPaxRate {
  id?: string;
  season_id?: string;
  band_name: string;
  rate: number;
}

export interface TourPrivatePerPaxRate {
  id?: string;
  season_id?: string;
  pax_count: number;
  rate: number;
}

export interface TourVehicleRate {
  id?: string;
  season_id?: string;
  vehicle_type_id: string;
  rate: number;
  max_pax: number | null;
  max_pax_with_luggage: number | null;
  max_luggage: number | null;
  max_kms_day: number | null;
  max_hrs_day: number | null;
  supplement_hr: number | null;
  supplement_km: number | null;
  vehicle_types?: {
    brand: string | null;
    code: string;
    label: string;
    pax_capacity: number | null;
    has_luggage_variant: boolean;
    pax_capacity_with_luggage: number | null;
    luggage_capacity: number | null;
  } | null;
}

export interface TourPackageSeason {
  id: string;
  package_id: string;
  dmc_id?: string;
  sort_order: number | null;
  status: string;
  exception_rules: string | null;
  total_rate: number | null;
  total_min_pax: number | null;
  total_max_pax: number | null;
  vehicle_rate_type: TourVehicleRateType | null;
  child_discount_type: TourDiscountType | null;
  child_discount_value: number | null;
  infant_discount_type: TourDiscountType | null;
  infant_discount_value: number | null;
  created_at?: string;
  updated_at?: string;
  tour_season_date_ranges: TourSeasonDateRange[];
  tour_season_blackout_dates: TourSeasonBlackoutDate[];
  tour_season_pax_rates: TourPaxRate[];
  tour_season_private_rates: TourPrivatePerPaxRate[];
  tour_season_vehicle_rates: TourVehicleRate[];
}

export interface TourAgePolicyBand {
  id?: string;
  package_id?: string;
  band_name: string;
  age_from: number;
  age_to: number;
  band_order?: number;
}

export interface TourPackageTax {
  id?: string;
  package_id?: string;
  name: string;
  rate: number;
  rate_type: "percentage" | "fixed";
  is_inclusive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Tab 4 — Addons
// ─────────────────────────────────────────────────────────────────────────

export interface TourAddonAgePolicyBand {
  id?: string;
  addon_id?: string;
  band_name: string;
  age_from: number;
  age_to: number;
  band_order: number;
}

export interface TourAddonRate {
  id?: string;
  addon_id?: string;
  band_name: string;
  rate: number | null;
}

export interface TourAddonTotalRateTier {
  id?: string;
  addon_id?: string;
  min_pax: number;
  max_pax: number;
  rate: number;
}

export interface TourAddonImage {
  id: string;
  addon_id: string;
  url: string;
  caption?: string | null;
  sort_order?: number | null;
  created_at?: string;
}

export interface TourAddonDetail {
  id: string;
  tour_id: string;
  dmc_id?: string;
  name: string;
  description: string | null;
  total_rate: number | null;
  max_participants: number | null;
  notes: string | null;
  sort_order: number | null;
  status: string;
  is_mandatory?: boolean;
  created_at?: string;
  updated_at?: string;
  tour_addon_age_policies: TourAddonAgePolicyBand[];
  tour_addon_rates: TourAddonRate[];
  tour_addon_total_rates: TourAddonTotalRateTier[];
  tour_addon_images: TourAddonImage[];
}

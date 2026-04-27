export type Season = {
  dates?: string; // Simple string like "All Season" or "Current - Oct 31"
  sic_rate_adult?: number | null;
  sic_rate_child?: number | null;
  pvt_rate?: Record<string, number>;
  per_vehicle_rate?: Array<{
    rate?: number;
    brand?: string;
    capacity?: string;
    vehicle_type?: string;
    max_passengers?: number | null;
    max_luggage?: number | null;
  }>;
  exception_rules?: string; // Exception rules for this season
  order?: number;
};

export type OperationalHours = {
  day: string;
  time_start: string;
  time_end: string;
};

// Transfer type options grouped for multiselect dropdown
export const TRANSFER_TYPE_GROUPS = [
  {
    group: "Airport/Port/Station Transfers",
    options: [
      { value: "airport_to_hotel", label: "Airport to Hotel" },
      { value: "hotel_to_airport", label: "Hotel to Airport" },
      { value: "airport_to_port", label: "Airport to Port" },
      { value: "port_to_airport", label: "Port to Airport" },
      { value: "port_to_hotel", label: "Port to Hotel" },
      { value: "hotel_to_port", label: "Hotel to Port" },
      { value: "station_to_hotel", label: "Station to Hotel" },
      { value: "hotel_to_station", label: "Hotel to Station" },
    ],
  },
  {
    group: "Tour Transfers",
    options: [
      { value: "hotel_to_tour", label: "Hotel to Tour" },
      { value: "tour_to_hotel", label: "Tour to Hotel" },
      { value: "tour_to_tour", label: "Tour to Tour" },
    ],
  },
  {
    group: "Inter-City/Hotel Transfers",
    options: [
      { value: "inter_city", label: "Inter-City" },
      { value: "hotel_to_hotel", label: "Hotel to Hotel" },
    ],
  },
] as const;

// Flat list of all options for validation and display
export const TRANSFER_TYPE_OPTIONS = TRANSFER_TYPE_GROUPS.flatMap((g) => g.options as unknown as { value: string; label: string }[]);

export type TransferType = (typeof TRANSFER_TYPE_OPTIONS)[number]["value"];

export type TransferPackage = {
  id: string;
  created_at?: string;
  updated_at?: string;
  transfer_id: string;
  name: string;
  description?: string;
  remarks?: string;
  notes?: string;
  num_stops?: number | null;
  duration?: { days?: number; hours?: number; minutes?: number } | null;
  inclusions?: string;
  exclusions?: string;
  child_policy?: string;
  preferred?: boolean;
  iscombo?: boolean;
  order?: number;
  origin?: string;
  destination?: string;
  via?: string;
  meeting_point?: string;
  pickup_point?: string;
  dropoff_point?: string;
  seasons: Season[];
  images?: string[];
  operational_hours?: OperationalHours[];
  transfer_type?: TransferType[];
  transfer_package_datastore_id?: string | null;
  is_unlinked?: boolean;
};

export type TransferAddOn = {
  id?: string;
  transfer_id?: string;
  name: string;
  description?: string;
  is_mandatory?: boolean;
  age_policy?: any;
  remarks?: string;
  notes?: string;
  rate_adult?: number;
  rate_child?: number;
  rate_teenager?: number;
  rate_infant?: number;
  total_rate?: number;
  max_participants?: number;
  images?: string[];
  transfer_add_on_datastore_id?: string | null;
  is_unlinked?: boolean;
};

export type Transfer = {
  id?: string;
  created_at: string;
  updated_at?: string;
  transfer_name: string;
  description: string;
  mode: string;
  route: string;
  vehicle_price: number;
  preferred: boolean;
  markup: number;
  rule: string;
  raw_rates: string;
  child_policy: string;
  cancellation_policy: string;
  remarks: string;
  currency: string;
  country: string;
  state: string | null;
  city: string;
  country_name?: string;
  city_name?: string;
  rates: string;
  images: string[];
  examples: string;
  packages?: TransferPackage[];
  add_ons?: TransferAddOn[];
  transfer_datastore_id?: string | null;
  is_unlinked?: boolean;
  is_unsaved?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────
// New module (NestJS-backed). Coexists with the legacy Supabase-direct
// `Transfer` shape above; do not merge — they map to different tables.
// ─────────────────────────────────────────────────────────────────────────

export type TransferModeOfTransport = "vehicle_p2p" | "vehicle_disposal";

export type TransferStatus =
  | "draft"
  | "active"
  | "inactive"
  | "published"
  | "archived";

export interface TransferListRow {
  id: string;
  name: string;
  status: TransferStatus | string;
  country_id: string | null;
  currency_id: string | null;
  mode_of_transport: TransferModeOfTransport | string | null;
  markup_pct: number | null;
  is_preferred: boolean;
  created_at: string;
}

export interface TransferCreateInput {
  name: string;
  mode_of_transport: TransferModeOfTransport;
  country_id: string | null;
  currency_id: string | null;
  description: string | null;
  status: TransferStatus;
  is_preferred?: boolean;
}

export type TransferUpdateInput = Partial<TransferCreateInput>;

export interface TransferCreated {
  id: string;
  [key: string]: unknown;
}

// Shape returned by GET /api/transfers/:id — the row plus nested arrays.
// Tab 1 only consumes the top-level columns; nested children typed loosely
// until Tabs 2/3/4 are built.
export interface TransferDetail extends TransferListRow {
  description?: string | null;
  transfer_images?: unknown[];
  transfer_addons?: unknown[];
  transfer_packages?: unknown[];
  [key: string]: unknown;
}

export interface TransferCountryOption {
  id: string;
  country_code: string;
  country_name: string;
  is_active?: boolean;
}

export interface TransferCurrencyOption {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
}

export type VehicleType = NonNullable<Season["per_vehicle_rate"]>[number] & { id: string };

// Valid vehicle type for vehicle rate grid
export type ValidVehicle = {
  vehicle_type: string;
  brand: string;
  max_passengers?: number | null;
  max_luggage?: number | null;
};

// ─────────────────────────────────────────────────────────────────────────
// Tab 2 — Packages, Stops, Hours, Cancellation
// ─────────────────────────────────────────────────────────────────────────

export type PackageStopLocation = {
  kind: 'geo' | 'dmc_custom' | 'master_catalog';
  id: string;
};

// Raw row shape returned by GET /api/transfers/:id/packages — Supabase returns
// the underlying `transfer_package_stop_locations` columns un-normalised.
export type PackageStopLocationRow = {
  id?: string;
  stop_id?: string;
  geo_id: string | null;
  dmc_custom_location_id: string | null;
  master_catalog_id: string | null;
};

export type PackageStop = {
  id?: string;
  stop_order: number;
  stop_type: 'origin' | 'via' | 'destination';
  notes?: string | null;
  // GET response returns `transfer_package_stop_locations`. The save payload
  // uses `locations` ({kind,id}). Both are accepted here so the same type can
  // be used for inbound and outbound.
  transfer_package_stop_locations?: PackageStopLocationRow[];
  locations?: PackageStopLocation[];
};

export type OperationalHour = {
  day_of_week: number; // ISO 8601: 1=Mon, 7=Sun
  is_active: boolean;
  start_time: string | null; // HH:MM or null
  end_time: string | null; // HH:MM or null
};

export type CancellationRule = {
  id?: string;
  days_from: number;
  days_to: number;
  anchor: string;
  charge_type: string;
  charge_value: number;
  is_no_show: boolean;
};

export type CancellationPolicy = {
  id?: string;
  package_id: string;
  is_non_refundable: boolean;
};

export type TransferPackageDetail = {
  id: string;
  transfer_id: string;
  name: string;
  description: string | null;
  notes: string | null;
  service_type?: string | null;
  service_mode: 'private' | 'sic';
  trip_type: 'one_way' | 'round_trip';
  direction_id: string | null;
  duration_days: number;
  duration_hours: number;
  duration_minutes: number;
  meeting_point: string | null;
  pickup_point: string | null;
  dropoff_point: string | null;
  inclusions: string | null;
  exclusions: string | null;
  is_preferred: boolean;
  sort_order?: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  transfer_package_stops?: PackageStop[];
  transfer_operational_hours?: OperationalHour[];
  transfer_cancellation_policies?: Array<CancellationPolicy & { transfer_cancellation_rules?: CancellationRule[] }>;
  transfer_package_addons?: TransferPackageAddonLink[];
};

export type TransferPackageCreateInput = Omit<
  TransferPackageDetail,
  'id' | 'transfer_id' | 'created_at' | 'updated_at' | 'transfer_package_stops' | 'transfer_operational_hours' | 'transfer_cancellation_policies'
>;

// ─────────────────────────────────────────────────────────────────────────
// Tab 3 — Seasons & Rates
// ─────────────────────────────────────────────────────────────────────────

export type DiscountType = 'percent' | 'fixed';

export type VehicleRateType = 'per_vehicle' | 'per_hour' | 'per_km';

export type SeasonDateRange = {
  valid_from: string; // ISO date
  valid_till: string; // ISO date
};

export type SeasonBlackoutDate = {
  blackout_date: string; // ISO date
};

export type SicRate = {
  id?: string;
  season_id?: string;
  adult_rate: number;
  child_rate: number;
  max_pax: number | null;
  max_luggage: number | null;
  supplement_hr: number | null;
  supplement_km: number | null;
};

export type PrivatePerPaxRate = {
  id?: string;
  season_id?: string;
  pax_count: number;
  rate: number;
};

export type VehicleRateRow = {
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
};

export type TransferSeason = {
  id: string;
  package_id: string;
  dmc_id?: string;
  name: string | null;
  exception_rules: string | null;
  sort_order: number | null;
  status: string;
  vehicle_rate_type: VehicleRateType | null;
  child_discount_type: DiscountType | null;
  child_discount_value: number | null;
  infant_discount_type: DiscountType | null;
  infant_discount_value: number | null;
  created_at?: string;
  updated_at?: string;
  transfer_season_date_ranges: SeasonDateRange[];
  transfer_season_blackout_dates: SeasonBlackoutDate[];
  transfer_season_sic_rates: SicRate[];
  transfer_season_private_rates: PrivatePerPaxRate[];
  transfer_season_vehicle_rates: VehicleRateRow[];
};

export type AgePolicyBand = {
  id?: string;
  package_id?: string;
  band_name: string;
  age_from: number;
  age_to: number;
  band_order?: number;
};

export type PackageTax = {
  id?: string;
  name: string;
  rate: number;
  rate_type: 'percentage' | 'fixed';
  is_inclusive: boolean;
};

// ─────────────────────────────────────────────────────────────────────────
// Tab 4 — Add-ons
// ─────────────────────────────────────────────────────────────────────────

export interface TransferAddonAgePolicyBand {
  id?: string;
  addon_id?: string;
  band_name: string;
  age_from: number;
  age_to: number;
  band_order: number;
}

export interface TransferAddonRate {
  id?: string;
  addon_id?: string;
  band_name: string;
  rate: number | null;
}

export interface TransferAddonTotalRateTier {
  id?: string;
  addon_id?: string;
  min_pax: number;
  max_pax: number;
  rate: number;
}

export interface TransferAddonImage {
  id: string;
  addon_id: string;
  url: string;
  caption?: string | null;
  sort_order?: number | null;
  created_at?: string;
}

export interface TransferPackageAddonLink {
  id?: string;
  addon_id: string;
  package_id?: string;
  is_mandatory: boolean;
}

export interface TransferAddonDetail {
  id: string;
  transfer_id: string;
  dmc_id?: string;
  name: string;
  description: string | null;
  total_rate: number | null;
  max_participants: number | null;
  notes: string | null;
  sort_order: number | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  transfer_addon_age_policies: TransferAddonAgePolicyBand[];
  transfer_addon_rates: TransferAddonRate[];
  transfer_addon_total_rates: TransferAddonTotalRateTier[];
  transfer_addon_images: TransferAddonImage[];
}

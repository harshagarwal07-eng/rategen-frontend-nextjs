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

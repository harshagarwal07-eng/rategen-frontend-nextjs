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

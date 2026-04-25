export interface FDCountry {
  id: string;
  country_name: string;
  country_code: string;
}

export interface FDCity {
  id: string;
  city_name: string;
  country_code: string | null;
  type?: string;
}

export interface FDCurrency {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
}

export interface FDPackageListRow {
  id: string;
  name: string;
  status: string | null;
  duration_nights: number | null;
  created_at: string;
  next_departure: string | null;
  departure_count: number;
  country_names: string[];
  city_names: string[];
}

export interface FDPackageDetail {
  id: string;
  supplier_id: string | null;
  name: string;
  description: string | null;
  main_image_url: string | null;
  banner_image_url: string | null;
  duration_nights: number | null;
  age_restriction: boolean | null;
  min_age: number | null;
  max_age: number | null;
  max_group_size: number | null;
  tour_code: string | null;
  departure_city_id: string | null;
  currency: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  fd_age_policies?: FDAgePolicy[];
  [key: string]: unknown;
}

export interface FDItineraryDay {
  id?: string;
  package_id?: string;
  day_number: number;
  title: string;
  description: string | null;
  includes: string | null;
  meals_included: string[];
  overnight_city: string | null;
  overnight_city_id: string | null;
  accommodation_note: string | null;
  image_url: string | null;
}

export interface FDAgePolicy {
  id?: string;
  package_id?: string;
  band_name: string;
  age_from: number;
  age_to: number;
  band_order: number;
}

export const AGE_BANDS = ["Infant", "Child", "Adult"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const PACKAGE_STATUSES = ["active", "inactive"] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

export const FD_ADDON_TYPES = ["day_tour", "multi_day_tour", "meal", "transfer", "other"] as const;
export type FDAddonType = (typeof FD_ADDON_TYPES)[number];

export interface FDAddonItineraryDay {
  id?: string;
  addon_id?: string;
  day_number: number;
  title: string;
  description: string | null;
  includes: string | null;
  meals_included: string[];
  overnight_city: string | null;
  overnight_city_id: string | null;
  accommodation_note: string | null;
  image_url: string | null;
}

export interface FDAddon {
  id: string;
  package_id: string;
  name: string;
  description: string | null;
  addon_type: FDAddonType;
  is_mandatory: boolean | null;
  duration_days: number | null;
  price_adult: number | null;
  price_child: number | null;
  price_infant: number | null;
  price_unit: string | null;
  max_capacity: number | null;
  inclusions: string[];
  exclusions: string[];
  transfer_type: string | null;
  transfer_mode: string | null;
  tour_includes_transfer: boolean | null;
  tour_transfer_type: string | null;
  use_custom_age_policy: boolean | null;
  custom_infant_age_from: number | null;
  custom_infant_age_to: number | null;
  custom_child_age_from: number | null;
  custom_child_age_to: number | null;
  custom_adult_age_from: number | null;
  custom_adult_age_to: number | null;
  fd_addon_itinerary_days?: FDAddonItineraryDay[];
}

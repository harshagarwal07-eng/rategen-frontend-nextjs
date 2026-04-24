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

export interface FDAgePolicy {
  id?: string;
  package_id?: string;
  band_name: string;
  age_from: number;
  age_to: number;
  band_order: number;
}

export const AGE_BANDS = ["Infant", "Child", "Teen", "Adult"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const PACKAGE_STATUSES = ["active", "inactive"] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

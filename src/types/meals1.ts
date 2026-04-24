export interface MealCuisine {
  id: string;
  name: string;
  created_at?: string;
}

export interface MealAgePolicies {
  id?: string;
  meal_package_id?: string;
  band_type: "adult" | "child" | "infant";
  age_from: number;
  age_to: number;
}

export interface MealPricing {
  id?: string;
  meal_package_id?: string;
  band_type: "adult" | "child" | "infant";
  amount: number;
}

export interface MealCancellationPolicy {
  id?: string;
  meal_package_id?: string;
  days_before: number;
  penalty_type: "percentage" | "fixed";
  penalty_amount: number;
}

export interface MealPackage {
  id?: string;
  meal_product_id?: string;
  name: string;
  description?: string | null;
  type: "veg" | "non-veg" | "veg-non-veg";
  cuisine_id?: string | null;
  venue_name?: string | null;
  menu_url?: string | null;
  inclusions?: string | null;
  exclusions?: string | null;
  images?: string[] | null;
  is_preferred?: boolean;
  min_pax?: number | null;
  max_pax?: number | null;
  advance_booking_hours?: number | null;
  created_at?: string;
  updated_at?: string;
  cuisine?: MealCuisine | null;
  meal_age_policies?: MealAgePolicies[];
  meal_pricing?: MealPricing[];
  meal_cancellation_policies?: MealCancellationPolicy[];
}

export interface MealProduct {
  id?: string;
  name: string;
  currency: string;
  country_id?: string | null;
  geo_id?: string | null;
  package_count?: number;
  created_at?: string;
  updated_at?: string;
  country?: { id: string; country_name: string } | null;
  location?: { id: string; city_name: string; type: string } | null;
  meal_packages?: MealPackage[];
}

export type MealBandType = "adult" | "child" | "infant";

export interface AgeBandRow {
  band_type: MealBandType;
  age_from: number;
  age_to: number;
  amount: number;
}

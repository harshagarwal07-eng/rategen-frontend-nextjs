export type GuideType =
  | "local_guide"
  | "tour_manager"
  | "language_guide"
  | "driver_guide"
  | "transfer_guide";

export type DurationType = "half_day" | "full_day" | "multi_day" | "per_service";

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type RateUnit = "day" | "guide" | "hour" | "unit";

export interface Language {
  id: string;
  name: string;
  is_active?: boolean;
}

export interface GuideSupplementMaster {
  id: string;
  name: string;
  is_active?: boolean;
}

export interface GuidePackageLanguage {
  id?: string;
  package_id?: string;
  language: string;
}

export interface GuidePackageOperationalHour {
  id?: string;
  package_id?: string;
  day_of_week: DayOfWeek;
  is_active: boolean;
  start_time: string | null;
  end_time: string | null;
}

export interface GuidePackageTier {
  id?: string;
  package_id?: string;
  min_pax: number;
  max_pax: number | null;
  rate_per_guide: number;
  rate_unit: RateUnit | null;
  sort_order?: number;
}

export interface GuidePackageSupplement {
  id?: string;
  package_id?: string;
  supplement_id: string;
  is_included: boolean;
  rate_value: number | null;
  rate_unit: RateUnit | null;
  is_per_actuals: boolean;
}

export interface GuidePackage {
  id?: string;
  guide_id?: string;
  name: string;
  guide_type: GuideType;
  duration_type: DurationType;
  duration_hours?: number | null;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  guide_package_languages?: GuidePackageLanguage[];
  guide_package_operational_hours?: GuidePackageOperationalHour[];
  guide_package_tiers?: GuidePackageTier[];
  guide_package_supplements?: GuidePackageSupplement[];
}

export interface Guide {
  id?: string;
  name: string;
  country_id?: string | null;
  city_id?: string | null;
  currency: string;
  is_active: boolean;
  package_count?: number;
  created_at?: string;
  updated_at?: string;
  country?: { id: string; country_name: string } | null;
  city?: { id: string; city_name: string } | null;
  guide_packages?: GuidePackage[];
}

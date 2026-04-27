// Hotel Tab 3 (Rates) — wire types matching backend DTOs
// (backend/src/modules/hotels/dto/rates-matrix.dto.ts +
// backend/src/modules/hotels/dto/age-pricing.dto.ts).

export interface MealPlan {
  id: string;
  code: string;
  name: string;
  category: string;
  sort_order: number;
}

export interface AgePricingRow {
  id?: string | null;
  age_policy_id: string;
  is_free?: boolean;
  max_free_count?: number | null;
  without_bed_price?: number | null;
  without_bed_price_type?: string | null;
  with_bed_price?: number | null;
  with_bed_price_type?: string | null;
}

export interface ContractRate {
  id: string;
  contract_id: string;
  room_category_id: string;
  season_id: string;
  market_id: string | null;
  meal_plan: string | null;
  meal_plan_id: string | null;
  rate_type: string;
  room_rate: number | null;
  single_rate: number | null;
  double_rate: number | null;
  triple_rate: number | null;
  quad_rate: number | null;
  extra_adult_supplement: number | null;
  extra_adult_supplement_type: string | null;
  allow_children: boolean | null;
  valid_days: number[] | null;
  status: "active" | "inactive";
  bar_rate: number | null;
  commission_percentage: number | null;
  extra_adult_supplement_bar_percentage: number | null;
  age_pricing?: AgePricingRow[];
}

export interface AgePricingPayloadItem {
  id?: string | null;
  age_policy_id: string;
  is_free?: boolean;
  max_free_count?: number;
  without_bed_price?: number;
  without_bed_price_type?: string;
  with_bed_price?: number;
  with_bed_price_type?: string;
}

export interface RatesPayloadItem {
  id?: string | null;
  room_category_id: string;
  season_id: string;
  meal_plan?: string;
  meal_plan_id?: string;
  market_id?: string;
  rate_type: string;
  room_rate?: number;
  single_rate?: number;
  double_rate?: number;
  triple_rate?: number;
  quad_rate?: number;
  extra_adult_supplement?: number;
  extra_adult_supplement_type?: string;
  allow_children?: boolean;
  valid_days?: number[];
  bar_rate?: number;
  commission_percentage?: number;
  extra_adult_supplement_bar_percentage?: number;
  status?: "active" | "inactive";
  age_pricing?: AgePricingPayloadItem[];
}

export interface BulkReplaceResponse {
  items: ContractRate[];
  diff: { inserted: number; updated: number; deleted: number };
}

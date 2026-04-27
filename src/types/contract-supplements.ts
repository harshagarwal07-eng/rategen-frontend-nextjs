// Hotel Tab 4 (Supplements) — wire types matching backend DTOs
// (backend/src/modules/hotels/dto/supplements.dto.ts).

export type SupplementType = "meal_plan" | "transfer" | "other";
export type SupplementChargeBasis = "per_person" | "per_room";
export type SupplementChargeFrequency = "per_night" | "per_stay";
export type SupplementTripType = "one_way" | "round_trip";
export type SupplementStatus = "active" | "inactive";
export type SupplementDateRangeType = "valid" | "booking";

export interface SupplementDateRange {
  id?: string;
  range_type: SupplementDateRangeType;
  date_from: string;
  date_to: string;
}

export interface SupplementMealPlanRow {
  id?: string;
  meal_plan: string;
}

export interface SupplementRoomCategoryRow {
  id?: string;
  room_category_id: string;
  is_mandatory?: boolean;
}

export interface SupplementContractTaxRow {
  id?: string;
  contract_tax_id: string;
  is_inclusive: boolean;
}

export interface SupplementAgePricingRow {
  id?: string;
  age_policy_id: string;
  is_free?: boolean;
  price?: number | null;
  price_type?: "fixed" | "percentage" | null;
}

export interface SupplementBase {
  id: string;
  dmc_id: string;
  contract_id: string;
  name: string;
  supplement_type: SupplementType;
  is_mandatory: boolean;
  charge_basis: SupplementChargeBasis;
  charge_frequency: SupplementChargeFrequency;
  valid_from: string | null;
  valid_till: string | null;
  booking_from: string | null;
  booking_till: string | null;
  market_id: string | null;
  is_combinable: boolean;
  minimum_stay: number | null;
  status: SupplementStatus;
  trip_type: SupplementTripType | null;
  free_pax_count: number | null;
  meal_plan_id: string | null;
  flat_amount: number | null;
  flat_amount_type: "fixed" | "percentage" | null;
  is_free: boolean;
  created_at: string;
}

export interface SupplementDetail extends SupplementBase {
  date_ranges: SupplementDateRange[];
  meal_plans: SupplementMealPlanRow[];
  room_categories: SupplementRoomCategoryRow[];
  contract_taxes: SupplementContractTaxRow[];
  age_pricing: SupplementAgePricingRow[];
}

export interface CreateSupplementPayload {
  name: string;
  supplement_type?: SupplementType;
  is_mandatory?: boolean;
  charge_basis?: SupplementChargeBasis;
  charge_frequency?: SupplementChargeFrequency;
  valid_from?: string | null;
  valid_till?: string | null;
  booking_from?: string | null;
  booking_till?: string | null;
  market_id?: string | null;
  is_combinable?: boolean;
  minimum_stay?: number;
  status?: SupplementStatus;
  trip_type?: SupplementTripType | null;
  flat_amount?: number | null;
  flat_amount_type?: "fixed" | "percentage" | null;
  is_free?: boolean;
  meal_plan_id?: string | null;
}

export type UpdateSupplementPayload = Partial<CreateSupplementPayload>;

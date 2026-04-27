// Hotel Tab 5 (Offers) — wire types matching backend DTOs
// (backend/src/modules/hotels/dto/offers.dto.ts).

export type OfferType =
  | "early_bird"
  | "long_stay"
  | "free_night"
  | "honeymoon"
  | "family"
  | "repeater"
  | "custom";

export type OfferStatus = "active" | "inactive";
export type OfferDateRangeType = "valid" | "booking" | "blackout";
export type OfferDiscountType = "fixed" | "percentage";
export type OfferDiscountBasis = "per_stay" | "per_person" | "per_room";
export type OfferDiscountAppliesTo = "adults_only" | "adults_and_children";

export interface OfferDateRange {
  id?: string;
  range_type: OfferDateRangeType;
  date_from: string;
  date_to: string;
}

export interface OfferRoomCategoryRow {
  id?: string;
  room_category_id: string;
}

export interface OfferMealPlanRow {
  id?: string;
  meal_plan: string;
}

export interface OfferCancellationRule {
  id?: string;
  days_from: number | null;
  days_to: number | null;
  anchor: "checkin_date" | "booking_date" | null;
  is_non_refundable: boolean;
  is_no_show: boolean;
  charge_type: "percentage" | "nights" | null;
  charge_value: number | null;
}

export interface OfferEarlyBirdRow {
  id?: string;
  book_before_days?: number | null;
  discount_value?: number | null;
  discount_type?: OfferDiscountType | null;
  minimum_stay?: number | null;
}

export interface OfferLongStayRow {
  id?: string;
  minimum_nights?: number | null;
  discount_value?: number | null;
  discount_type?: OfferDiscountType | null;
}

export interface OfferFreeNightRow {
  id?: string;
  stay_nights?: number | null;
  pay_nights?: number | null;
  minimum_stay?: number | null;
}

export interface OfferHoneymoonRow {
  id?: string;
  discount_value?: number | null;
  discount_type?: OfferDiscountType | null;
  minimum_stay?: number | null;
}

export interface OfferFamilyRow {
  id?: string;
  discount_value?: number | null;
  discount_type?: OfferDiscountType | null;
  minimum_adults?: number | null;
  minimum_children?: number | null;
  minimum_stay?: number | null;
}

export interface OfferRepeaterRow {
  id?: string;
  discount_value?: number | null;
  discount_type?: OfferDiscountType | null;
  minimum_stay?: number | null;
}

export interface OfferCustomRow {
  id?: string;
  description?: string | null;
  discount_value?: number | null;
  discount_type?: OfferDiscountType | null;
  minimum_stay?: number | null;
}

export interface OfferBase {
  id: string;
  dmc_id: string;
  contract_id: string;
  offer_type: OfferType;
  name: string;
  code: string | null;
  priority: number | null;
  valid_from: string | null;
  valid_till: string | null;
  booking_from: string | null;
  booking_till: string | null;
  market_id: string | null;
  discount_applies_to: OfferDiscountAppliesTo | null;
  max_discounted_adults: number | null;
  apply_on_extra_bed: boolean;
  apply_on_extra_meal: boolean;
  is_combinable: boolean;
  status: OfferStatus;
  discount_value: number | null;
  discount_type: OfferDiscountType | null;
  book_before_days: number | null;
  minimum_nights: number | null;
  stay_nights: number | null;
  pay_nights: number | null;
  minimum_adults: number | null;
  minimum_children: number | null;
  is_non_refundable: boolean;
  discount_basis: OfferDiscountBasis | null;
  created_at: string;
}

export interface OfferDetail extends OfferBase {
  room_categories: OfferRoomCategoryRow[];
  meal_plans: OfferMealPlanRow[];
  date_ranges: OfferDateRange[];
  cancellation_policy: OfferCancellationRule[];
  early_bird: OfferEarlyBirdRow[];
  long_stay: OfferLongStayRow[];
  free_night: OfferFreeNightRow[];
  honeymoon: OfferHoneymoonRow[];
  family: OfferFamilyRow[];
  repeater: OfferRepeaterRow[];
  custom: OfferCustomRow[];
  combinations: string[]; // partner offer ids
}

export interface CreateOfferPayload {
  offer_type: OfferType;
  name: string;
  code?: string | null;
  priority?: number;
  valid_from?: string | null;
  valid_till?: string | null;
  booking_from?: string | null;
  booking_till?: string | null;
  market_id?: string | null;
  discount_applies_to?: OfferDiscountAppliesTo;
  max_discounted_adults?: number | null;
  apply_on_extra_bed?: boolean;
  apply_on_extra_meal?: boolean;
  is_combinable?: boolean;
  status?: OfferStatus;
  discount_value?: number | null;
  discount_type?: OfferDiscountType | null;
  book_before_days?: number | null;
  minimum_nights?: number | null;
  stay_nights?: number | null;
  pay_nights?: number | null;
  minimum_adults?: number | null;
  minimum_children?: number | null;
  is_non_refundable?: boolean;
  discount_basis?: OfferDiscountBasis | null;
}

export type UpdateOfferPayload = Partial<CreateOfferPayload>;

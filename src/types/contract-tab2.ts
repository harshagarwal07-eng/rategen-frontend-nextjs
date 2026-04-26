// Types for Hotel Overlay → Tab 2 (Rooms & Seasons).
// Matches backend DTOs in backend/src/modules/hotels/dto/{age-policies,rooms,seasons,taxes}.dto.ts.

export type AgeBandScope = "rooms" | "meals";

export interface AgePolicyBand {
  id?: string | null;
  label: string;
  age_from: number;
  age_to: number;
}

export interface AgePoliciesResponse {
  rooms: AgePolicyBand[];
  meals: AgePolicyBand[];
}

export interface ContractRoom {
  id?: string | null;
  name: string;
  min_occupancy?: number | null;
  normal_occupancy?: number | null;
  max_total_occupancy?: number | null;
  max_adults_without_children?: number | null;
  max_adults_with_children?: number | null;
  allow_children: boolean;
  max_children?: number | null;
  allow_teens: boolean;
  max_teens?: number | null;
  allow_infants: boolean;
  max_infants?: number | null;
  infants_count_towards_occupancy: boolean;
  max_extra_beds?: number | null;
  child_extra_bed_min_age?: number | null;
  // Hardcoded server-side concerns we always send but don't expose in v1 UI.
  children_count_towards_occupancy?: boolean;
  teens_count_towards_occupancy?: boolean;
  status?: "active" | "inactive";
}

export interface SeasonDateRange {
  date_from: string; // YYYY-MM-DD
  date_to: string; // YYYY-MM-DD
}

export interface ContractSeason {
  id?: string | null;
  name: string;
  date_ranges: SeasonDateRange[];
}

// Backend GET seasons (with ?include=date_ranges) nests under season_date_ranges.
export interface ContractSeasonRow {
  id: string;
  name: string;
  contract_id: string;
  created_at: string;
  season_date_ranges?: Array<{ id: string; date_from: string; date_to: string }> | null;
}

export type TaxRateType = "percentage" | "fixed";

export interface ContractTax {
  id?: string | null; // present in GET response but NOT accepted in PUT body
  name: string;
  rate: number;
  rate_type: TaxRateType;
  is_inclusive: boolean;
  applies_to_room_category_ids: string[]; // empty = applies to all rooms
}

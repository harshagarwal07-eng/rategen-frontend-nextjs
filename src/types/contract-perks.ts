// Hotel Tab 5 (Perks) — wire types matching backend DTOs
// (backend/src/modules/hotels/dto/perks.dto.ts).

export type PerkStatus = "active" | "inactive";

export interface PerkRoomCategoryRow {
  id?: string;
  room_category_id: string;
}

export interface PerkBase {
  id: string;
  dmc_id: string;
  contract_id: string;
  offer_id: string | null;
  name: string;
  inclusions: string[];
  valid_from: string | null;
  valid_till: string | null;
  market_id: string | null;
  status: PerkStatus;
  max_pax: number | null;
  min_age: number | null;
  max_age: number | null;
  is_free: boolean;
  minimum_stay: number | null;
  created_at: string;
}

export interface PerkDetail extends PerkBase {
  room_categories: PerkRoomCategoryRow[];
}

export interface CreatePerkPayload {
  name: string;
  offer_id?: string | null;
  valid_from?: string | null;
  valid_till?: string | null;
  market_id?: string | null;
  status?: PerkStatus;
  max_pax?: number | null;
  min_age?: number | null;
  max_age?: number | null;
  is_free?: boolean;
  inclusions?: string[];
  minimum_stay?: number | null;
}

export type UpdatePerkPayload = Partial<CreatePerkPayload>;

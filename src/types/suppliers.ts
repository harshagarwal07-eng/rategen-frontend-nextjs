import type { IOption } from "./common";

export type ItemTypes = "hotel" | "tour" | "transfer" | "meal" | "guide";
export type BookingMode = "online" | "offline" | "online_or_offline";

export interface ISupplierOption extends IOption {
  supplier_item_id: string;
}

export interface ISupplierTeamMemberData {
  id?: string;
  supplier_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  department?: string[];
  is_primary?: boolean;
}

export interface ISupplierItemData {
  id?: string;
  supplier_id?: string;
  item_type: ItemTypes;
  hotel_id?: string | null;
  tour_id?: string | null;
  transfer_id?: string | null;
  tour_package_id?: string | null;
  transfer_package_id?: string | null;
  meal_id?: string | null;
  guide_id?: string | null;
  pocs?: Array<{
    team_member_id: string;
    is_primary: boolean;
  }>;
  order?: number;
  hotel_name?: string | null;
  tour_name?: string | null;
  transfer_name?: string | null;
  package_name?: string | null;
  meal_name?: string | null;
  guide_type?: string | null;
  poc_details?: ISupplierTeamMemberData[];
}

export type SupplierAssociation = {
  supplier_id: string;
  supplier_name?: string;
  is_active?: boolean;
  poc_ids: string[];
  primary_poc_id?: string;
  package_ids?: string[];
  package_names?: Record<string, string>;
};

export interface ISupplierData {
  id: string;
  name: string;
  category?: ItemTypes[];
  website?: string;
  is_active: boolean;
  address?: string;
  city?: string;
  country?: string;
  city_name?: string;
  country_name?: string;
  booking_mode?: BookingMode;
  dmc_id: string;
  created_at: string;
  updated_at: string;
  // Relations
  team_members?: ISupplierTeamMemberData[];
  contacts?: ISupplierTeamMemberData[];
}

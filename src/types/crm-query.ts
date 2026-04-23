import { OrgCatagory } from "./crm-agency";
import { FileAttachment } from "./common";
import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons/lib";

// Actual database statuses
export type QueryStatus = "ongoing" | "booked" | "live" | "completed" | "cancelled" | "archived";

// UI filter statuses
export type QueryFilterStatus = QueryStatus | "all";
export type QueryType = "fit" | "git";
export type QueryServices = "hotel" | "tour" | "transfer";
export type QueryRoles = "dmc" | "agent" | "ai" | "system";

export interface IPaxDetails {
  adults: number;
  children: number;
  children_ages?: number[];
}

export interface ICrmQueryCard {
  id: string;
  query_id: string;
  created_at: string;
  updated_at: string;
  status: QueryStatus;
  query_type: QueryType;
  pax_details: IPaxDetails;
  travel_countries: string[];
  travel_country_names: string[];
  traveler_name: string;
  ta_name: string;
  ta_category: OrgCatagory;
  services: string[];
  travel_date: string;
  duration: number;
  is_flagged_by_dmc: boolean;
  dmc_pin_count?: number;
}

export interface IQueryDetails {
  ta_name: string;
  ta_id: string;
  tas_ta_id?: string;
  ta_city?: string;
  ta_city_name?: string;
  ta_country: string;
  ta_country_name?: string;
  ta_admin_name: string;
  ta_admin_email: string;
  ta_admin_phone: string;
  ta_category: OrgCatagory | null;
  website: string;
  avatar_url: string;

  status: string;
  source: string;
  source_name: string;
  id: string;
  query_id: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  services: string[];
  query_type: string;

  travel_date: string;
  traveler_name: string;
  nationality?: string;
  nationality_name?: string;
  travel_countries: string[];
  travel_country_names: string[];
  pax_details: IPaxDetails;
  duration: number;
  is_flagged_by_dmc: boolean;
  dmc_pin_count?: number;
  message?: string; // AI chat initial message (editable)
}

export interface IQueryMessage {
  id: string;
  created_at: string;
  updated_at: string;
  text: string;
  created_by?: {
    user_id: string;
    name: string;
  };
  query_id: string;
  files: FileAttachment[];
  edited: boolean;
  role: QueryRoles;
  is_pinned?: boolean;
}

export interface IRateItem {
  id: number;
  particulars: string;
  status: string;
  date: string;
  totalCost: number;
  markupPercentage: number;
  markupFixed: number;
  quotedPrice: number;
}

export interface IRateTableData {
  data: IRateItem[];
  heading: string;
  category: string;
  totalCost: number;
  totalQuotedCost: number;
}

export interface ItineraryItemTemplate {
  category: string;
  name: string;
  description: string;
}

export interface ItineraryItem extends ItineraryItemTemplate {
  id: string;
  price: string;
  date: string;
  [key: string]: any;
}

export interface Itinerary {
  id: number;
  title: string;
  date: string;
  data: ItineraryItem[] | [];
}

export interface ITpripOptions {
  label: string;
  value: string;
  icon?: LucideIcon | IconType;
}

// Old payment types removed - use @/types/ops-accounts for new payment plan system

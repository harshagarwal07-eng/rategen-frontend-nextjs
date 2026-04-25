import { IHotelRoom } from "@/components/forms/schemas/hotels-datastore-schema";
import type { MealType } from "@/constants/meal-types";

// DMC Hotels (NestJS /api/hotels backend)
export interface DmcHotel {
  id: string;
  name: string;
  hotel_code?: string | null;
  currency: string;
  property_type?: string | null;
  country_id?: string | null;
  country?: string | null;
  city_id?: string | null;
  city?: string | null;
  country_name?: string | null;
  city_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  star_rating?: number | null;
  is_preferred: boolean;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  description?: string | null;
  status: "active" | "inactive";
  created_at: string;
  dmc_id: string;
  master_hotel_id?: string | null;
  contract_count: number;
}

export interface DmcHotelListResponse {
  data: DmcHotel[];
  total: number;
}

export type AgePolicy = {
  adult: {
    rooms?: { from: number; to: number };
    meals?: { from: number; to: number };
  };
  teenager?: {
    rooms?: { from: number; to: number };
    meals?: { from: number; to: number };
  };
  child?: {
    rooms?: { from: number; to: number };
    meals?: { from: number; to: number };
  };
  infant?: {
    rooms?: { from: number; to: number };
    meals?: { from: number; to: number };
  };
};

export type MealPlanRate = {
  meal_type: MealType;
  rates?: {
    adult?: number;
    teenager?: number;
    child?: number;
    infant?: number;
  };
};

export type Hotel = {
  id: string;
  created_at: string;
  updated_at?: string;
  hotel_name: string;
  hotel_code: string;
  hotel_address: string;
  hotel_city: string;
  hotel_state: string;
  hotel_country: string;
  hotel_phone: string;
  hotel_email: string;
  hotel_description: string;
  hotel_currency: string;
  examples: string;
  offers: string;
  cancellation_policy: string;
  remarks: string;
  payment_policy: string;
  group_policy: string;
  property_type: string;
  star_rating: string;
  rooms?: IHotelRoom[];
  preferred: boolean;
  markup: number;
  age_policy?: AgePolicy;
  meal_plan_rates?: MealPlanRate[];
  images?: string[];
  hotel_datastore_id: string | null;
  is_unlinked: boolean;
};

import { searchParams } from "@/lib/searchparams";
import { createSearchParamsCache, createSerializer, parseAsArrayOf, parseAsString } from "nuqs/server";

export const datastoreSearchParams = {
  ...searchParams,
  hotel_name: parseAsString,
  tour_name: parseAsString,
  transfer_name: parseAsString,
  title: parseAsString, // for combos
  meal_name: parseAsString,
  country: parseAsArrayOf(parseAsString).withDefault([]),
  state: parseAsArrayOf(parseAsString).withDefault([]),
  city: parseAsArrayOf(parseAsString).withDefault([]),
  guide_type: parseAsArrayOf(parseAsString).withDefault([]),
  currency: parseAsArrayOf(parseAsString).withDefault([]),
  // Library filters - Vehicles
  v_number: parseAsString,
  brand: parseAsString,
  v_type: parseAsString,
  category: parseAsString,
  // Library filters - Drivers & Guides
  name: parseAsString,
  gender: parseAsArrayOf(parseAsString).withDefault([]),
  payroll_type: parseAsArrayOf(parseAsString).withDefault([]),
  // Library filters - Restaurants
  country_name: parseAsString,
  city_name: parseAsString,
  // Library filters - Common
  status: parseAsArrayOf(parseAsString).withDefault([]),
};

export const datastoreSearchParamsCache = createSearchParamsCache(datastoreSearchParams);
export const datastoreSerialize = createSerializer(datastoreSearchParams);

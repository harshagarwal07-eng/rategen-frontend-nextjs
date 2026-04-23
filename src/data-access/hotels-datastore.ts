"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";

export const getHotelDatastoreById = async (id: string) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("hotels_datastore")
    .select(
      `
        *,
        countries!hotels_datastore_country_fkey(country_name),
        cities!hotels_datastore_city_fkey(city_name),
        rooms:hotel_rooms_datastore(*)
      `
    )
    .eq("id", id)
    .order("sort_order", {
      foreignTable: "hotel_rooms_datastore",
      ascending: true,
    })
    .single();

  if (error) return { error: error.message };

  const transformedData = {
    ...data,
    country_name: data.countries?.country_name || "N/A",
    city_name: data.cities?.city_name || "N/A",
  };

  return { data: transformedData };
};

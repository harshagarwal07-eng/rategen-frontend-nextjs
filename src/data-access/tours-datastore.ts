"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";

export const getTourDatastoreById = async (tourId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: null, error: "User not found" };

  const { data, error } = await supabase
    .from("tours_datastore")
    .select(
      `
      *,
      countries!tours_datastore_country_fkey(country_name),
      cities!tours_datastore_city_fkey(city_name),
      tour_packages_datastore!tour_packages_datastore_tour_fkey(
        *,
        tour_package_add_ons_datastore!tour_package_add_ons_datastore_package_fkey(
          add_on_id,
          is_mandatory,
          tour_add_ons_datastore!tour_package_add_ons_datastore_add_on_fkey(*)
        )
      ),
      tour_add_ons_datastore!tour_add_ons_datastore_tour_fkey(*)
    `
    )
    .eq("id", tourId)
    .single();

  if (error || !data) {
    console.error(`Error fetching tour ${tourId}: ${error?.message || "Tour not found"}`);
    return { data: null, error: error?.message || "Tour not found" };
  }

  // Transform data to match expected format
  const transformedData = {
    ...(data as any),
    country_name: data.countries?.country_name || "N/A",
    city_name: data.cities?.city_name || "N/A",
    packages:
      data.tour_packages_datastore?.map((pkg: any) => ({
        ...pkg,
        selected_add_ons:
          pkg.tour_package_add_ons_datastore?.map((addOnMapping: any) => ({
            ...addOnMapping.tour_add_ons_datastore,
            is_mandatory: addOnMapping.is_mandatory,
          })) || [],
      })) || [],
    add_ons: data.tour_add_ons_datastore || [],
  };

  return { data: transformedData, error: null };
};

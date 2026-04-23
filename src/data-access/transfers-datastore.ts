"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";

export const getTransferDatastoreById = async (transferId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: null, error: "User not found" };

  const { data, error } = await supabase
    .from("transfers_datastore")
    .select(
      `
      *,
      countries!transfers_datastore_country_fkey(country_name),
      cities!transfers_datastore_city_fkey(city_name),
      transfer_packages_datastore!transfer_packages_datastore_transfer_fkey(
        *,
        transfer_package_add_ons_datastore!transfer_package_add_ons_datastore_package_fkey(
          transfer_add_on_id,
          is_mandatory,
          transfer_add_ons_datastore!transfer_package_add_ons_datastore_add_on_fkey(*)
        )
      ),
      transfer_add_ons_datastore!transfer_add_ons_datastore_transfer_fkey(*)
    `
    )
    .eq("id", transferId)
    .single();

  if (error || !data) {
    console.error(`Error fetching transfer ${transferId}: ${error?.message || "Tour not found"}`);
    return { data: null, error: error?.message || "Tour not found" };
  }

  // Transform data to match expected format
  const transformedData = {
    ...(data as any),
    country_name: data.countries?.country_name || "N/A",
    city_name: data.cities?.city_name || "N/A",
    packages:
      data.transfer_packages_datastore?.map((pkg: any) => ({
        ...pkg,
        selected_add_ons:
          pkg.transfer_package_add_ons_datastore?.map((addOnMapping: any) => ({
            ...addOnMapping.transfer_add_ons_datastore,
            is_mandatory: addOnMapping.is_mandatory,
          })) || [],
      })) || [],
    add_ons: data.transfer_add_ons_datastore || [],
  };

  return { data: transformedData, error: null };
};

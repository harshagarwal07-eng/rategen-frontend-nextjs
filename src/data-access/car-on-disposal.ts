"use server";

import { DatastoreSearchParams } from "@/types/datastore";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "./auth";
import { ICarOnDisposalDatastore } from "@/components/forms/schemas/car-on-disposal-datastore-schema";

export async function getAllCarOnDisposalsByUser(
  params: DatastoreSearchParams
) {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], totalItems: 0 };

  const {
    sort,
    country,
    page = 1,
    perPage = 25,
    "car on disposal": carOnDisposal,
    currency,
  } = params;

  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const query = supabase
    .from("car_on_disposals")
    .select(`*, countries!car_on_disposals_country_fkey(country_name)`, {
      count: "exact",
    })
    .eq("dmc_id", user.dmc.id)
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    })
    .limit(perPage)
    .range(start, end);
  if (country?.length > 0) query.ilikeAnyOf("country", country);
  if (currency?.length > 0) query.ilikeAnyOf("currency", currency);
  if (carOnDisposal) query.ilike("name", `%${carOnDisposal}%`);

  const { data, error, count } = await query;
  if (error) {
    console.error(
      `Error fetching car on disposal for user ${user.id}: ${error.message}`
    );
    return { data: [], totalItems: 0 };
  }

  // Transform the data to flatten the joined field
  const transformedData =
    data?.map((item) => ({
      ...item,
      country_name: item.countries?.country_name || "N/A",
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
}

export async function createCarOnDisposal(
  carOnDisposal: ICarOnDisposalDatastore
) {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };
  const { data, error } = await supabase
    .from("car_on_disposals")
    .insert({ ...carOnDisposal, created_by: user.id, dmc_id: user.dmc.id })
    .select()
    .single();
  if (error) return { error: error.message };

  return { data };
}

export const updateCarOnDisposal = async (
  id: string,
  carOnDisposal: ICarOnDisposalDatastore
) => {
  const supabase = await createClient();

  const user = await getCurrentUser();

  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("car_on_disposals")
    .update({ ...carOnDisposal, dmc_id: user.dmc.id })
    .eq("id", id)
    .eq("dmc_id", user.dmc.id)
    .select()
    .single();

  if (error) return { error: error.message };

  return { data };
};

export const deleteCarOnDisposal = async (id: string) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("car_on_disposals")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  return { data: null };
};

"use server";

import { DatastoreSearchParams } from "@/types/datastore";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "./auth";
import { IMealsDatastore } from "@/components/forms/schemas/meals-datastore-schema";
import { SupplierAssociation } from "@/types/suppliers";

export async function getAllMealsByUser(params: DatastoreSearchParams) {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], totalItems: 0 };

  const { sort, country, page = 1, perPage = 25, currency, meal_name: mealName } = params;

  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const query = supabase
    .from("meals")
    .select(
      `*, 
      countries!meals_country_fkey(country_name), 
      cities!meals_city_fkey(city_name)`,
      {
        count: "exact",
      }
    )
    .eq("dmc_id", user.dmc.id)
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    })
    .limit(perPage)
    .range(start, end);

  if (country?.length > 0) query.in("country", country);
  if (currency?.length > 0) query.in("currency", currency);
  if (mealName) query.ilike("meal_name", `%${mealName}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching meal for user ${user.id}: ${error.message}`);
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

export async function getMealById(id: string) {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: null, error: "User not found" };

  const { data, error } = await supabase
    .from("meals")
    .select(
      `*,
      countries!meals_country_fkey(country_name),
      cities!meals_city_fkey(city_name),
      supplier_items:rategen_supplier_items(
        id,
        supplier_id,
        supplier:rategen_suppliers(name, is_active),
        pocs:rategen_supplier_item_pocs(team_member_id, is_primary)
      )`
    )
    .eq("id", id)
    .eq("dmc_id", user.dmc.id)
    .single();

  if (error) {
    console.error(`Error fetching meal ${id}: ${error.message}`);
    return { data: null, error: error.message };
  }

  const supplierAssociations: SupplierAssociation[] = Object.values(
    ((data as any).supplier_items || []).reduce((acc: any, item: any) => {
      const sid = item.supplier_id;
      if (!acc[sid]) {
        acc[sid] = {
          supplier_id: sid,
          supplier_name: item.supplier?.name ?? undefined,
          is_active: item.supplier?.is_active ?? true,
          poc_ids: [],
          primary_poc_id: undefined,
          package_ids: [],
          package_names: {},
        };
      }
      (item.pocs || []).forEach((p: any) => {
        if (!acc[sid].poc_ids.includes(p.team_member_id)) acc[sid].poc_ids.push(p.team_member_id);
        if (p.is_primary) acc[sid].primary_poc_id = p.team_member_id;
      });
      return acc;
    }, {})
  ) as SupplierAssociation[];

  // Transform the data to flatten the joined field
  const transformedData = {
    ...data,
    country_name: (data as any).countries?.country_name || "N/A",
    supplier_associations: supplierAssociations,
  };

  return { data: transformedData, error: null };
}

export async function createMeal(meal: IMealsDatastore) {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("meals")
    .insert({ ...meal, state: meal.state || null, created_by: user.id, dmc_id: user.dmc.id })
    .select()
    .single();

  if (error) return { error: error.message };

  return { data };
}

export const updateMeal = async (id: string, meal: IMealsDatastore) => {
  const supabase = await createClient();

  const user = await getCurrentUser();

  if (!user) return { error: "User not found" };

  // Remove fields that come from joins or shouldn't be updated
  const { countries, country_name, cities, supplier_items, supplier_associations, ...cleanMeal } = meal as any;

  const { data, error } = await supabase
    .from("meals")
    .update({ ...cleanMeal, state: cleanMeal.state || null, dmc_id: user.dmc.id })
    .eq("id", id)
    .eq("dmc_id", user.dmc.id)
    .select()
    .single();
  if (error) return { error: error.message };

  return { data };
};

export const deleteMeal = async (id: string) => {
  const supabase = await createClient();

  const { error } = await supabase.from("meals").delete().eq("id", id);

  if (error) return { error: error.message };

  return { data: null };
};

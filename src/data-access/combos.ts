"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";
import { DatastoreSearchParams } from "@/types/datastore";

export interface ICombo {
  id?: string;
  title: string;
  description?: string;
  remarks?: string;
  combo_type?: "AND" | "OR";
  min_packages?: number;
  max_packages?: number;
  age_policy?: Record<string, any>;
  currency?: string;
  country?: string;
  state?: string;
  city?: string;
  created_by?: string;
  dmc_id?: string;
  created_at?: string;
  updated_at?: string;
  // Relations
  items?: any[];
  seasons?: any[];
  // Joined fields
  country_name?: string;
  city_name?: string;
}

/**
 * Get a single combo by ID with all related data (items, seasons)
 */
export const getComboById = async (comboId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: null, error: "User not found" };

  const { data, error } = await supabase
    .from("combos")
    .select(
      `
      *,
      countries!combos_country_fkey(country_name),
      cities!combos_city_fkey(city_name),
      combo_items(
        *,
        tours(tour_name),
        transfers(transfer_name),
        tour_packages(name, age_policy, seasons),
        transfer_packages(name, seasons)
      ),
      combo_seasons(*)
    `
    )
    .eq("id", comboId)
    .eq("dmc_id", user.dmc.id)
    .single();

  if (error || !data) {
    console.error(`Error fetching combo ${comboId}: ${error?.message || "Combo not found"}`);
    return { data: null, error: error?.message || "Combo not found" };
  }

  // Transform data to match expected format
  const transformedData = {
    ...data,
    country_name: data.countries?.country_name || null,
    city_name: data.cities?.city_name || null,
    items:
      data.combo_items?.map((item: any) => ({
        ...item,
        tour_name: item.tours?.tour_name,
        transfer_name: item.transfers?.transfer_name,
        source_package: item.tour_packages || item.transfer_packages,
      })) || [],
    seasons: data.combo_seasons || [],
  };

  return { data: transformedData, error: null };
};

/**
 * Get all combos for the current user with pagination and filters
 */
export const getAllCombosByUser = async (params: DatastoreSearchParams) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], totalItems: 0 };

  const { sort, perPage = 25, page = 1, currency, title } = params;

  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const query = supabase
    .from("combos")
    .select(
      `
      *,
      countries!combos_country_fkey(country_name),
      cities!combos_city_fkey(city_name),
      combo_items(id, item_type, package_name),
      combo_seasons(id)
    `,
      { count: "exact" }
    )
    .eq("dmc_id", user.dmc.id)
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    })
    .limit(perPage)
    .range(start, end);

  if (title) query.ilike("title", `%${title}%`);
  if (currency?.length > 0) query.ilikeAnyOf("currency", currency);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching combos for user ${user.id}: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item: any) => ({
      ...item,
      country_name: item.countries?.country_name || null,
      city_name: item.cities?.city_name || null,
      items_count: item.combo_items?.length || 0,
      seasons_count: item.combo_seasons?.length || 0,
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
};

/**
 * Create a new combo
 */
export const createCombo = async (combo: ICombo) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const comboData = {
    title: combo.title,
    description: combo.description,
    remarks: combo.remarks,
    combo_type: combo.combo_type || "AND",
    min_packages: combo.min_packages ?? 2,
    max_packages: combo.max_packages || null,
    age_policy: combo.age_policy,
    currency: combo.currency,
    country: combo.country || null,
    state: combo.state || null,
    city: combo.city || null,
    created_by: user.id,
    dmc_id: user.dmc.id,
  };

  // Remove undefined fields
  Object.keys(comboData).forEach(
    (key) => comboData[key as keyof typeof comboData] === undefined && delete comboData[key as keyof typeof comboData]
  );

  const { data, error } = await supabase.from("combos").insert(comboData).select().single();

  if (error) return { error: error.message };

  return { data };
};

/**
 * Update an existing combo
 */
export const updateCombo = async (id: string, combo: Partial<ICombo>) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const comboData: Record<string, any> = {
    title: combo.title,
    description: combo.description,
    remarks: combo.remarks,
    combo_type: combo.combo_type || "AND",
    min_packages: combo.min_packages ?? 2,
    max_packages: combo.max_packages || null,
    age_policy: combo.age_policy,
    currency: combo.currency,
    country: combo.country || null,
    state: combo.state || null,
    city: combo.city || null,
    updated_at: new Date().toISOString(),
  };

  // Remove undefined fields
  Object.keys(comboData).forEach((key) => comboData[key] === undefined && delete comboData[key]);

  const { data, error } = await supabase
    .from("combos")
    .update(comboData)
    .eq("id", id)
    .eq("dmc_id", user.dmc.id)
    .select()
    .single();

  if (error) return { error: error.message };

  return { data };
};

/**
 * Delete a combo (cascades to items and seasons)
 */
export const deleteCombo = async (id: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase.from("combos").delete().eq("id", id).eq("dmc_id", user.dmc.id);

  if (error) return { error: error.message };

  return { data: null };
};

/**
 * Bulk delete combos
 */
export const bulkDeleteCombos = async (ids: string[]) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase.from("combos").delete().in("id", ids).eq("dmc_id", user.dmc.id);

  if (error) return { error: error.message };

  return { data: null };
};

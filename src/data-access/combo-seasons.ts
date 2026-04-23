"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";

export interface IComboSeason {
  id?: string;
  combo_id?: string;
  dates?: string;
  blackout_dates?: string;
  exception_rules?: string;
  order?: number;
  ticket_only_rate_adult?: number;
  ticket_only_rate_child?: number;
  ticket_only_rate_teenager?: number;
  ticket_only_rate_infant?: number;
  sic_rate_adult?: number;
  sic_rate_child?: number;
  sic_rate_teenager?: number;
  sic_rate_infant?: number;
  pvt_rate?: Record<string, number>;
  per_vehicle_rate?: Array<{
    rate?: number;
    brand?: string;
    capacity?: string;
    vehicle_type?: string;
  }>;
  total_rate?: number;
}

/**
 * Get all seasons for a combo
 */
export const getComboSeasons = async (comboId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], error: "User not found" };

  const { data, error } = await supabase
    .from("combo_seasons")
    .select("*")
    .eq("combo_id", comboId)
    .order("order", { ascending: true });

  if (error) {
    console.error(`Error fetching seasons for combo ${comboId}: ${error.message}`);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
};

/**
 * Create a combo season
 */
export const createComboSeason = async (season: IComboSeason) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("combo_seasons")
    .insert(season)
    .select()
    .single();

  if (error) {
    console.error(`Error creating combo season: ${error.message}`);
    return { error: error.message };
  }

  return { data };
};

/**
 * Update a combo season
 */
export const updateComboSeason = async (seasonId: string, season: Partial<IComboSeason>) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("combo_seasons")
    .update(season)
    .eq("id", seasonId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating combo season ${seasonId}: ${error.message}`);
    return { error: error.message };
  }

  return { data };
};

/**
 * Delete a combo season
 */
export const deleteComboSeason = async (seasonId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase
    .from("combo_seasons")
    .delete()
    .eq("id", seasonId);

  if (error) {
    console.error(`Error deleting combo season ${seasonId}: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

/**
 * Bulk upsert combo seasons
 */
export const bulkUpsertComboSeasons = async (comboId: string, seasons: IComboSeason[]) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  if (!seasons || seasons.length === 0) {
    // Delete all existing seasons if array is empty
    const { error: deleteError } = await supabase
      .from("combo_seasons")
      .delete()
      .eq("combo_id", comboId);

    if (deleteError) {
      console.error(`Error deleting combo seasons: ${deleteError.message}`);
      return { error: deleteError.message };
    }

    return { data: [] };
  }

  // First, delete seasons that are no longer in the list
  const existingIds = seasons.filter((s) => s.id).map((s) => s.id);

  if (existingIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("combo_seasons")
      .delete()
      .eq("combo_id", comboId)
      .not("id", "in", `(${existingIds.join(",")})`);

    if (deleteError) {
      console.error(`Error deleting removed combo seasons: ${deleteError.message}`);
    }
  } else {
    // No existing IDs, delete all seasons for this combo
    const { error: deleteError } = await supabase
      .from("combo_seasons")
      .delete()
      .eq("combo_id", comboId);

    if (deleteError) {
      console.error(`Error deleting all combo seasons: ${deleteError.message}`);
    }
  }

  // Prepare seasons for upsert
  const seasonsForUpsert = seasons.map((season, index) => ({
    id: season.id || crypto.randomUUID(),
    combo_id: comboId,
    dates: season.dates,
    blackout_dates: season.blackout_dates,
    exception_rules: season.exception_rules,
    order: index,
    ticket_only_rate_adult: season.ticket_only_rate_adult,
    ticket_only_rate_child: season.ticket_only_rate_child,
    ticket_only_rate_teenager: season.ticket_only_rate_teenager,
    ticket_only_rate_infant: season.ticket_only_rate_infant,
    sic_rate_adult: season.sic_rate_adult,
    sic_rate_child: season.sic_rate_child,
    sic_rate_teenager: season.sic_rate_teenager,
    sic_rate_infant: season.sic_rate_infant,
    pvt_rate: season.pvt_rate,
    per_vehicle_rate: season.per_vehicle_rate,
    total_rate: season.total_rate,
  }));

  const { data, error } = await supabase
    .from("combo_seasons")
    .upsert(seasonsForUpsert, { onConflict: "id" })
    .select();

  if (error) {
    console.error(`Error bulk upserting combo seasons: ${error.message}`);
    return { error: error.message };
  }

  return { data };
};

/**
 * Delete all seasons for a combo
 */
export const deleteComboSeasonsByComboId = async (comboId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase
    .from("combo_seasons")
    .delete()
    .eq("combo_id", comboId);

  if (error) {
    console.error(`Error deleting seasons for combo ${comboId}: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

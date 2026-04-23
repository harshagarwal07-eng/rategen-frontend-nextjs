"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";

export interface IComboItem {
  id?: string;
  combo_id: string;
  item_type: "tour" | "transfer";
  tour_id?: string | null;
  transfer_id?: string | null;
  tour_package_id?: string | null;
  transfer_package_id?: string | null;
  package_name?: string;
  order?: number;
}

/**
 * Get all items for a combo
 */
export const getComboItems = async (comboId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], error: "User not found" };

  const { data, error } = await supabase
    .from("combo_items")
    .select(
      `
      *,
      tours(tour_name),
      transfers(transfer_name),
      tour_packages(name, age_policy, seasons),
      transfer_packages(name, seasons)
    `
    )
    .eq("combo_id", comboId)
    .order("order", { ascending: true });

  if (error) {
    console.error(`Error fetching items for combo ${comboId}: ${error.message}`);
    return { data: [], error: error.message };
  }

  // Transform data
  const transformedData =
    data?.map((item: any) => ({
      ...item,
      tour_name: item.tours?.tour_name,
      transfer_name: item.transfers?.transfer_name,
      source_package: item.tour_packages || item.transfer_packages,
    })) || [];

  return { data: transformedData, error: null };
};

/**
 * Create a combo item
 */
export const createComboItem = async (item: IComboItem) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const itemData = {
    combo_id: item.combo_id,
    item_type: item.item_type,
    tour_id: item.item_type === "tour" ? item.tour_id : null,
    transfer_id: item.item_type === "transfer" ? item.transfer_id : null,
    tour_package_id: item.item_type === "tour" ? item.tour_package_id : null,
    transfer_package_id: item.item_type === "transfer" ? item.transfer_package_id : null,
    package_name: item.package_name,
    order: item.order ?? 0,
  };

  const { data, error } = await supabase
    .from("combo_items")
    .insert(itemData)
    .select()
    .single();

  if (error) {
    console.error(`Error creating combo item: ${error.message}`);
    return { error: error.message };
  }

  return { data };
};

/**
 * Delete a combo item
 */
export const deleteComboItem = async (itemId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase
    .from("combo_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error(`Error deleting combo item ${itemId}: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

/**
 * Bulk upsert combo items
 */
export const bulkUpsertComboItems = async (comboId: string, items: IComboItem[]) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  if (!items || items.length === 0) {
    // Delete all existing items if array is empty
    const { error: deleteError } = await supabase
      .from("combo_items")
      .delete()
      .eq("combo_id", comboId);

    if (deleteError) {
      console.error(`Error deleting combo items: ${deleteError.message}`);
      return { error: deleteError.message };
    }

    return { data: [] };
  }

  // First, delete items that are no longer in the list
  const existingIds = items.filter((item) => item.id).map((item) => item.id);

  if (existingIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("combo_items")
      .delete()
      .eq("combo_id", comboId)
      .not("id", "in", `(${existingIds.join(",")})`);

    if (deleteError) {
      console.error(`Error deleting removed combo items: ${deleteError.message}`);
    }
  } else {
    // No existing IDs, delete all items for this combo
    const { error: deleteError } = await supabase
      .from("combo_items")
      .delete()
      .eq("combo_id", comboId);

    if (deleteError) {
      console.error(`Error deleting all combo items: ${deleteError.message}`);
    }
  }

  // Prepare items for upsert
  const itemsForUpsert = items.map((item, index) => ({
    id: item.id || crypto.randomUUID(),
    combo_id: comboId,
    item_type: item.item_type,
    tour_id: item.item_type === "tour" ? item.tour_id : null,
    transfer_id: item.item_type === "transfer" ? item.transfer_id : null,
    tour_package_id: item.item_type === "tour" ? item.tour_package_id : null,
    transfer_package_id: item.item_type === "transfer" ? item.transfer_package_id : null,
    package_name: item.package_name,
    order: index,
  }));

  const { data, error } = await supabase
    .from("combo_items")
    .upsert(itemsForUpsert, { onConflict: "id" })
    .select();

  if (error) {
    console.error(`Error bulk upserting combo items: ${error.message}`);
    return { error: error.message };
  }

  return { data };
};

/**
 * Delete all items for a combo
 */
export const deleteComboItemsByComboId = async (comboId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase
    .from("combo_items")
    .delete()
    .eq("combo_id", comboId);

  if (error) {
    console.error(`Error deleting items for combo ${comboId}: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

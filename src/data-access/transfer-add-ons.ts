"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";
import { ITransferAddOn } from "@/components/forms/schemas/transfers-datastore-schema";

export const getTransferAddOns = async (transferId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], error: "User not found" };

  const { data, error } = await supabase
    .from("transfer_add_ons")
    .select("*")
    .eq("transfer_id", transferId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Error fetching add-ons for transfer ${transferId}: ${error.message}`);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
};

export const createTransferAddOn = async (addOnData: ITransferAddOn) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase.from("transfer_add_ons").insert(addOnData).select().single();

  if (error) {
    console.error(`Error creating add-on: ${error.message}`);
    return { error: error.message };
  }

  return { data };
};

export const updateTransferAddOn = async (addOnId: string, addOnData: Partial<ITransferAddOn>) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase.from("transfer_add_ons").update(addOnData).eq("id", addOnId).select().single();

  if (error) {
    console.error(`Error updating add-on ${addOnId}: ${error.message}`);
    return { error: error.message };
  }

  return { data };
};

export const deleteTransferAddOn = async (addOnId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase.from("transfer_add_ons").delete().eq("id", addOnId);

  if (error) {
    console.error(`Error deleting add-on ${addOnId}: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

export const deleteTransferAddOnsByTransferId = async (transferId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase.from("transfer_add_ons").delete().eq("transfer_id", transferId);

  if (error) {
    console.error(`Error deleting add-ons for transfer ${transferId}: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

export const bulkUpsertTransferAddOns = async (
  transferId: string,
  addOns: ITransferAddOn[]
) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], error: "User not found" };

  if (!addOns.length) return { data: [], error: null };

  // Prepare add-ons with transfer_id and generate UUIDs for new ones
  const addOnsWithTransferId = addOns.map((addOn) => {
    const addOnData: any = {
      ...addOn,
      transfer_id: transferId,
    };
    // Generate UUID for new add-ons (without id or with empty string id)
    if (!addOnData.id || addOnData.id === "") {
      addOnData.id = crypto.randomUUID();
    }
    return addOnData;
  });

  const { data, error } = await supabase
    .from("transfer_add_ons")
    .upsert(addOnsWithTransferId, { onConflict: "id" })
    .select();

  if (error) {
    console.error(`Error bulk upserting add-ons: ${error.message}`);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
};

"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";
import { ITourAddOn } from "@/components/forms/schemas/tours-datastore-schema";

export const getTourAddOns = async (tourId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], error: "User not found" };

  const { data, error } = await supabase
    .from("tour_add_ons")
    .select("*")
    .eq("tour_id", tourId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Error fetching add-ons for tour ${tourId}: ${error.message}`);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
};

export const createTourAddOn = async (addOnData: ITourAddOn) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("tour_add_ons")
    .insert(addOnData)
    .select()
    .single();

  if (error) {
    console.error(`Error creating add-on: ${error.message}`);
    return { error: error.message };
  }

  return { data };
};

export const updateTourAddOn = async (addOnId: string, addOnData: Partial<ITourAddOn>) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("tour_add_ons")
    .update(addOnData)
    .eq("id", addOnId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating add-on ${addOnId}: ${error.message}`);
    return { error: error.message };
  }

  return { data };
};

export const deleteTourAddOn = async (addOnId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase
    .from("tour_add_ons")
    .delete()
    .eq("id", addOnId);

  if (error) {
    console.error(`Error deleting add-on ${addOnId}: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

export const deleteTourAddOnsByTourId = async (tourId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase
    .from("tour_add_ons")
    .delete()
    .eq("tour_id", tourId);

  if (error) {
    console.error(`Error deleting add-ons for tour ${tourId}: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

export const bulkUpsertTourAddOns = async (
  tourId: string,
  addOns: ITourAddOn[]
) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], error: "User not found" };

  if (!addOns.length) return { data: [], error: null };

  // Prepare add-ons with tour_id and generate UUIDs for new ones
  const addOnsWithTourId = addOns.map((addOn) => {
    const addOnData: any = {
      ...addOn,
      tour_id: tourId,
    };
    // Generate UUID for new add-ons (without id or with empty string id)
    if (!addOnData.id || addOnData.id === "") {
      addOnData.id = crypto.randomUUID();
    }
    return addOnData;
  });

  const { data, error } = await supabase
    .from("tour_add_ons")
    .upsert(addOnsWithTourId, { onConflict: "id" })
    .select();

  if (error) {
    console.error(`Error bulk upserting add-ons: ${error.message}`);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
};

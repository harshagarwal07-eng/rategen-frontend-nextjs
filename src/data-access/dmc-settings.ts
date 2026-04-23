"use server";

import { createClient } from "@/utils/supabase/server";
import { DMCSettings, UpdateDMCSettingsInput } from "@/types/dmc-settings";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";

export const getDmcSettings = async (): Promise<DMCSettings> => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");

  const { data, error } = await supabase
    .from("dmcs")
    .select(
      "pricing_breakup_rule, output_currency, chatdmc_listing, kill_switch, allow_individual_service_rates, bank_details"
    )
    .eq("id", user.dmc.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    pricing_breakup_rule: data.pricing_breakup_rule || "total_gross",
    output_currency: data.output_currency || "USD",
    chatdmc_listing: data.chatdmc_listing ?? false,
    kill_switch: data.kill_switch ?? false,
    allow_individual_service_rates: data.allow_individual_service_rates ?? false,
    bank_details: (data.bank_details as any[]) || [],
  };
};

export const updateDmcSettings = async (
  settings: UpdateDMCSettingsInput
): Promise<{ error?: string; success?: boolean }> => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");

  const { error } = await supabase
    .from("dmcs")
    .update(settings)
    .eq("id", user.dmc.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/dmc-settings");
  return { success: true };
};

export const getDmcBankDetails = async (dmcId?: string) => {
  const supabase = await createClient();

  // If dmcId is provided, get that DMC's bank details (for viewing in accounts section)
  // Otherwise, get current user's DMC bank details
  let targetDmcId = dmcId;

  if (!targetDmcId) {
    const user = await getCurrentUser();
    if (!user) throw new Error("User not found");
    // @ts-ignore - getCurrentUser returns user with dmc property
    targetDmcId = user.dmc.id;
  }

  const { data, error } = await supabase
    .from("dmcs")
    .select("bank_details")
    .eq("id", targetDmcId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return (data.bank_details as any[]) || [];
};

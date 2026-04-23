"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "./auth";
import { revalidatePath } from "next/cache";
import { IAppSettings } from "@/types/whitelabel-config";

export const getWhiteLabelSettings = async (): Promise<IAppSettings | null> => {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error("User not found");

  const { data, error } = await supabase
    .from("whitelabel_site_settings")
    .select(
      `
      id,
      created_at,
      permissions,
      payment_options,
      site_customizations,
      domain,
      dmc_id,
      dmcs (
        name,
        avatar_url
      ),
      status,
      dns_records
    `
    )
    .eq("dmc_id", user.dmc.id)
    .single();

  if (error) {
    // If no settings exist yet, return null (PGRST116 = no rows returned)
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  // Transform the dmcs array to a single object
  const transformedData: IAppSettings = {
    ...data,
    dmcs:
      Array.isArray(data.dmcs) && data.dmcs.length > 0
        ? data.dmcs[0]
        : undefined,
  };

  return transformedData;
};

export const createOrUpdateWhiteLabelSettings = async (
  settings: Partial<IAppSettings>
): Promise<{ error?: string; success?: boolean }> => {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return { error: "User not found" };

  const { error } = await supabase.from("whitelabel_site_settings").upsert(
    {
      dmc_id: user.dmc.id,
      permissions: settings.permissions || {},
      payment_options: settings.payment_options || {},
      site_customizations: settings.site_customizations || {},
      domain: settings.domain || "",
    },
    {
      onConflict: "dmc_id",
    }
  );

  if (error) {
    console.error("White label settings update error:", error);
    return { error: error.message };
  }

  revalidatePath("/settings/white-label");
  return { success: true };
};

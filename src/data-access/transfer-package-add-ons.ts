"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";

export const getTransferPackageAddOns = async (packageId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], error: "User not found" };

  const { data, error } = await supabase
    .from("transfer_package_add_ons")
    .select("transfer_add_on_id")
    .eq("transfer_package_id", packageId);

  if (error) {
    console.error(`Error fetching add-ons for package ${packageId}: ${error.message}`);
    return { data: [], error: error.message };
  }

  // Return array of add-on IDs
  return {
    data: data?.map((item) => item.transfer_add_on_id) || [],
    error: null,
  };
};

export const updateTransferPackageAddOns = async (
  packageId: string,
  addOns: Array<{ id: string; is_mandatory?: boolean } | string>
) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  // Delete existing mappings
  const { error: deleteError } = await supabase
    .from("transfer_package_add_ons")
    .delete()
    .eq("transfer_package_id", packageId);

  if (deleteError) {
    console.error(`Error deleting package add-ons: ${deleteError.message}`);
    return { error: deleteError.message };
  }

  // Insert new mappings
  if (addOns.length > 0) {
    const mappings = addOns.map((addOn) => {
      if (typeof addOn === "string") {
        return {
          transfer_package_id: packageId,
          transfer_add_on_id: addOn,
          is_mandatory: false,
        };
      }
      return {
        transfer_package_id: packageId,
        transfer_add_on_id: addOn.id,
        is_mandatory: addOn.is_mandatory || false,
      };
    });

    const { error: insertError } = await supabase.from("transfer_package_add_ons").insert(mappings);

    if (insertError) {
      console.error(`Error inserting package add-ons: ${insertError.message}`);
      return { error: insertError.message };
    }
  }

  return { success: true };
};

export const updateTransferPackageAddOnMandatory = async (packageId: string, addOnId: string, isMandatory: boolean) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase
    .from("transfer_package_add_ons")
    .update({ is_mandatory: isMandatory })
    .eq("transfer_package_id", packageId)
    .eq("transfer_add_on_id", addOnId);

  if (error) {
    console.error(`Error updating mandatory status: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

export const deleteTransferPackageAddOns = async (packageId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase.from("transfer_package_add_ons").delete().eq("transfer_package_id", packageId);

  if (error) {
    console.error(`Error deleting package add-ons for ${packageId}: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

// Bulk update add-ons for multiple packages in a single operation
export const bulkUpdateTransferPackageAddOns = async (
  packageAddOns: Array<{
    packageId: string;
    addOns: Array<{ id: string; is_mandatory?: boolean }>;
  }>
) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  // Get all package IDs
  const packageIds = packageAddOns.map((p) => p.packageId);

  if (packageIds.length === 0) {
    return { success: true };
  }

  // Delete all existing mappings for these packages in one call
  const { error: deleteError } = await supabase
    .from("transfer_package_add_ons")
    .delete()
    .in("transfer_package_id", packageIds);

  if (deleteError) {
    console.error(`Error bulk deleting package add-ons: ${deleteError.message}`);
    return { error: deleteError.message };
  }

  // Collect all new mappings
  const allMappings: Array<{
    transfer_package_id: string;
    transfer_add_on_id: string;
    is_mandatory: boolean;
  }> = [];

  for (const pkg of packageAddOns) {
    for (const addOn of pkg.addOns) {
      allMappings.push({
        transfer_package_id: pkg.packageId,
        transfer_add_on_id: addOn.id,
        is_mandatory: addOn.is_mandatory || false,
      });
    }
  }

  // Insert all new mappings in one call
  if (allMappings.length > 0) {
    const { error: insertError } = await supabase.from("transfer_package_add_ons").insert(allMappings);

    if (insertError) {
      console.error(`Error bulk inserting package add-ons: ${insertError.message}`);
      return { error: insertError.message };
    }
  }

  return { success: true };
};

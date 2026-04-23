"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";
import { ITransferPackage } from "@/components/forms/schemas/transfers-datastore-schema";
import {
  generateEmbeddingsBatch,
  createTransferSearchText,
} from "@/lib/embeddings/embedding-utils";

export const getTransferPackages = async (transferId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], error: "User not found" };

  const { data, error } = await supabase
    .from("transfer_packages")
    .select("*")
    .eq("transfer_id", transferId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Error fetching packages for transfer ${transferId}: ${error.message}`);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
};

export const createTransferPackage = async (packageData: ITransferPackage) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("transfer_packages")
    .insert(packageData)
    .select()
    .single();

  if (error) {
    console.error(`Error creating package: ${error.message}`);
    return { error: error.message };
  }

  return { data };
};

export const updateTransferPackage = async (packageId: string, packageData: Partial<ITransferPackage>) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("transfer_packages")
    .update(packageData)
    .eq("id", packageId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating package ${packageId}: ${error.message}`);
    return { error: error.message };
  }

  return { data };
};

export const deleteTransferPackage = async (packageId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase
    .from("transfer_packages")
    .delete()
    .eq("id", packageId);

  if (error) {
    console.error(`Error deleting package ${packageId}: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

export const deleteTransferPackagesByTransferId = async (transferId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase
    .from("transfer_packages")
    .delete()
    .eq("transfer_id", transferId);

  if (error) {
    console.error(`Error deleting packages for transfer ${transferId}: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

export const bulkUpsertTransferPackages = async (packages: ITransferPackage[]) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  if (!packages || packages.length === 0) {
    return { data: [] };
  }

  const { data, error } = await supabase
    .from("transfer_packages")
    .upsert(packages, { onConflict: 'id' })
    .select();

  if (error) {
    console.error(`Error bulk upserting transfer packages: ${error.message}`);
    return { error: error.message };
  }

  // Generate embeddings asynchronously after save
  if (data && data.length > 0) {
    const transferId = data[0].transfer_id;
    if (transferId) {
      regenerateTransferPackageEmbeddings(transferId).catch((err) => {
        console.error("Background transfer embedding regeneration failed:", err);
      });
    }
  }

  return { data };
};

/**
 * Regenerate embeddings for all packages of a transfer
 * This runs asynchronously after save to avoid blocking the UI
 */
async function regenerateTransferPackageEmbeddings(transferId: string): Promise<void> {
  const supabase = await createClient();

  try {
    // Fetch transfer and packages data needed for embeddings
    const { data: transfer, error: transferError } = await supabase
      .from("transfers")
      .select(
        `
        transfer_name,
        route,
        mode,
        countries!transfers_country_fkey(country_name),
        cities!transfers_city_fkey(city_name),
        packages:transfer_packages(id, name, description)
      `
      )
      .eq("id", transferId)
      .single();

    if (transferError || !transfer) {
      console.error("Failed to fetch transfer for embedding regeneration:", transferError);
      return;
    }

    const packages = transfer.packages || [];
    if (packages.length === 0) return;

    // Create search texts for all packages
    const searchTexts = packages.map((pkg: any) =>
      createTransferSearchText({
        transfer_name: transfer.transfer_name,
        package_name: pkg.name || "",
        route: transfer.route,
        mode: transfer.mode,
        city: (transfer.cities as any)?.city_name || "",
        country: (transfer.countries as any)?.country_name || "",
      })
    );

    // Generate embeddings in batch
    const embeddings = await generateEmbeddingsBatch(searchTexts);

    // Update each package with its embedding
    const updatePromises = packages.map((pkg: any, index: number) =>
      supabase
        .from("transfer_packages")
        .update({ embedding: JSON.stringify(embeddings[index]) })
        .eq("id", pkg.id)
    );

    await Promise.all(updatePromises);
    console.log(`Successfully regenerated embeddings for ${packages.length} packages of transfer ${transferId}`);
  } catch (error) {
    console.error("Error regenerating transfer package embeddings:", error);
  }
}

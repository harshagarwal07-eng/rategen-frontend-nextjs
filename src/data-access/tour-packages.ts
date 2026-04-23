"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";
import { ITourPackage } from "@/components/forms/schemas/tours-datastore-schema";
import {
  generateEmbeddingsBatch,
  createTourSearchText,
} from "@/lib/embeddings/embedding-utils";

export const getTourPackages = async (tourId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], error: "User not found" };

  const { data, error } = await supabase
    .from("tour_packages")
    .select("*")
    .eq("tour_id", tourId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Error fetching packages for tour ${tourId}: ${error.message}`);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
};

export const createPackage = async (packageData: ITourPackage) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("tour_packages")
    .insert(packageData)
    .select()
    .single();

  if (error) {
    console.error(`Error creating package: ${error.message}`);
    return { error: error.message };
  }

  return { data };
};

export const updatePackage = async (packageId: string, packageData: Partial<ITourPackage>) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("tour_packages")
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

export const deletePackage = async (packageId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase
    .from("tour_packages")
    .delete()
    .eq("id", packageId);

  if (error) {
    console.error(`Error deleting package ${packageId}: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

export const deletePackagesByTourId = async (tourId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase
    .from("tour_packages")
    .delete()
    .eq("tour_id", tourId);

  if (error) {
    console.error(`Error deleting packages for tour ${tourId}: ${error.message}`);
    return { error: error.message };
  }

  return { success: true };
};

export const bulkUpsertPackages = async (packages: ITourPackage[]) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  if (!packages || packages.length === 0) {
    return { data: [] };
  }

  const { data, error } = await supabase
    .from("tour_packages")
    .upsert(packages, { onConflict: 'id' })
    .select();

  if (error) {
    console.error(`Error bulk upserting packages: ${error.message}`);
    return { error: error.message };
  }

  // Generate embeddings asynchronously after save
  if (data && data.length > 0) {
    const tourId = data[0].tour_id;
    if (tourId) {
      regenerateTourPackageEmbeddings(tourId).catch((err) => {
        console.error("Background tour embedding regeneration failed:", err);
      });
    }
  }

  return { data };
};

/**
 * Regenerate embeddings for all packages of a tour
 * This runs asynchronously after save to avoid blocking the UI
 */
async function regenerateTourPackageEmbeddings(tourId: string): Promise<void> {
  const supabase = await createClient();

  try {
    // Fetch tour and packages data needed for embeddings
    const { data: tour, error: tourError } = await supabase
      .from("tours")
      .select(
        `
        tour_name,
        countries!tours_country_fkey(country_name),
        cities!tours_city_fkey(city_name),
        packages:tour_packages(id, name, description)
      `
      )
      .eq("id", tourId)
      .single();

    if (tourError || !tour) {
      console.error("Failed to fetch tour for embedding regeneration:", tourError);
      return;
    }

    const packages = tour.packages || [];
    if (packages.length === 0) return;

    // Create search texts for all packages
    const searchTexts = packages.map((pkg: any) =>
      createTourSearchText({
        tour_name: tour.tour_name,
        package_name: pkg.name || "",
        city: (tour.cities as any)?.city_name || "",
        country: (tour.countries as any)?.country_name || "",
        description: pkg.description,
      })
    );

    // Generate embeddings in batch
    const embeddings = await generateEmbeddingsBatch(searchTexts);

    // Update each package with its embedding
    const updatePromises = packages.map((pkg: any, index: number) =>
      supabase
        .from("tour_packages")
        .update({ embedding: JSON.stringify(embeddings[index]) })
        .eq("id", pkg.id)
    );

    await Promise.all(updatePromises);
    console.log(`Successfully regenerated embeddings for ${packages.length} packages of tour ${tourId}`);
  } catch (error) {
    console.error("Error regenerating tour package embeddings:", error);
  }
}

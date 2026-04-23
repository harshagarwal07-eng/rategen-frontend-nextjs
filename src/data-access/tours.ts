"use server";

import { IToursDatastore } from "@/components/forms/schemas/tours-datastore-schema";
import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";
import { DatastoreSearchParams } from "@/types/datastore";
import { removeFromS3 } from "@/lib/s3-upload";
import { SupplierAssociation } from "@/types/suppliers";

/**
 * Get a single tour by ID with all related data (packages, add-ons, etc.)
 */
export const getTourById = async (tourId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: null, error: "User not found" };

  const { data, error } = await supabase
    .from("tours")
    .select(
      `
      *,
      countries!tours_country_fkey(country_name),
      cities!tours_city_fkey(city_name),
      tour_packages!packages_tour_id_fkey(
        *,
        tour_package_add_ons!tour_package_add_ons_package_id_fkey(
          add_on_id,
          is_mandatory,
          tour_add_ons!tour_package_add_ons_add_on_id_fkey(*)
        )
      ),
      tour_add_ons!tour_add_ons_tour_id_fkey(*),
      supplier_items:rategen_supplier_items(
        id,
        supplier_id,
        tour_package_id,
        supplier:rategen_suppliers(name, is_active),
        pocs:rategen_supplier_item_pocs(team_member_id, is_primary)
      )
    `
    )
    .eq("id", tourId)
    .eq("dmc_id", user.dmc.id)
    .single();

  if (error || !data) {
    console.error(`Error fetching tour ${tourId}: ${error?.message || "Tour not found"}`);
    return { data: null, error: error?.message || "Tour not found" };
  }

  const packages =
    data.tour_packages?.map((pkg: any) => ({
      ...pkg,
      selected_add_ons:
        pkg.tour_package_add_ons?.map((addOnMapping: any) => ({
          ...addOnMapping.tour_add_ons,
          is_mandatory: addOnMapping.is_mandatory,
        })) || [],
    })) || [];

  // Build supplier_associations grouped by supplier_id
  const supplierAssociations: SupplierAssociation[] = Object.values(
    ((data as any).supplier_items || []).reduce((acc: any, item: any) => {
      const sid = item.supplier_id;
      if (!acc[sid]) {
        acc[sid] = {
          supplier_id: sid,
          supplier_name: item.supplier?.name ?? undefined,
          is_active: item.supplier?.is_active ?? true,
          poc_ids: [],
          primary_poc_id: undefined,
          package_ids: [],
          package_names: {},
        };
      }
      if (item.tour_package_id && !acc[sid].package_ids.includes(item.tour_package_id)) {
        acc[sid].package_ids.push(item.tour_package_id);
      }
      (item.pocs || []).forEach((p: any) => {
        if (!acc[sid].poc_ids.includes(p.team_member_id)) acc[sid].poc_ids.push(p.team_member_id);
        if (p.is_primary) acc[sid].primary_poc_id = p.team_member_id;
      });
      return acc;
    }, {})
  ) as SupplierAssociation[];

  // Transform data to match expected format
  const transformedData = {
    ...(data as any),
    country_name: data.countries?.country_name || "N/A",
    city_name: data.cities?.city_name || "N/A",
    packages,
    add_ons: data.tour_add_ons || [],
    supplier_associations: supplierAssociations,
  };

  return { data: transformedData, error: null };
};

/**
 * Get a single tour package by ID with all related data
 */
export const getTourPackageById = async (packageId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: null, error: "User not found" };

  const { data, error } = await supabase
    .from("tour_packages")
    .select(
      `
      *,
      tours!packages_tour_id_fkey(tour_name),
      tour_package_add_ons!tour_package_add_ons_package_id_fkey(
        add_on_id,
        is_mandatory,
        tour_add_ons!tour_package_add_ons_add_on_id_fkey(*)
      )
    `
    )
    .eq("id", packageId)
    .single();

  if (error || !data) {
    console.error(`Error fetching tour package ${packageId}: ${error?.message || "Package not found"}`);
    return { data: null, error: error?.message || "Package not found" };
  }

  // Transform data to match expected format
  // Note: age_policy is on tour_packages itself, not on tours
  const transformedData = {
    ...data,
    tour_name: data.tours?.tour_name || null,
    selected_add_ons:
      data.tour_package_add_ons?.map((addOnMapping: any) => ({
        ...addOnMapping.tour_add_ons,
        is_mandatory: addOnMapping.is_mandatory,
      })) || [],
  };

  return { data: transformedData, error: null };
};

/**
 * Search tour packages from vw_tours_packages view
 * Used in add-activity-popover for selecting tour packages
 */
export const searchTourPackages = async (params: { query?: string; limit?: number }) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [] };

  const { query, limit = 20 } = params;

  let dbQuery = supabase
    .from("vw_tours_packages")
    .select("id, tour_id, tour_name, package_name, package_description, package_preferred, duration, country, city")
    .eq("dmc_id", user.dmc.id)
    .limit(limit);

  if (query) {
    dbQuery = dbQuery.or(`package_name.ilike.%${query}%,tour_name.ilike.%${query}%`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error(`Error searching tour packages: ${error.message}`);
    return { data: [] };
  }

  return { data: data || [] };
};

export const getAllToursByUser = async (params: DatastoreSearchParams) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], totalItems: 0 };

  const { sort, country, city, perPage = 100, page = 1, currency, tour_name: tourName } = params;

  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const query = supabase
    .from("tours")
    .select(
      `
      *,
      countries!tours_country_fkey(country_name),
      cities!tours_city_fkey(city_name),
      tour_packages(*),
      tour_add_ons(*)
    `,
      { count: "exact" }
    )
    .eq("dmc_id", user.dmc.id)
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    })
    .limit(perPage)
    .range(start, end);

  if (country?.length > 0) query.ilikeAnyOf("country", country);
  if (city?.length > 0) query.ilikeAnyOf("city", city);
  if (currency?.length > 0) query.ilikeAnyOf("currency", currency);
  if (tourName) query.ilike("tour_name", `%${tourName}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching tours for user ${user.id}: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item: any) => ({
      ...item,
      country_name: item.countries?.country_name || "N/A",
      city_name: item.cities?.city_name || "N/A",
      packages: item.tour_packages || [],
      add_ons: item.tour_add_ons || [],
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
};

export const createTours = async (tour: IToursDatastore) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  // Only extract tour-level fields, exclude relations and invalid fields
  const tourData = {
    tour_name: tour.tour_name,
    description: tour.description,
    cancellation_policy: tour.cancellation_policy,
    remarks: tour.remarks,
    preferred: tour.preferred,
    country: tour.country,
    state: tour.state || null,
    city: tour.city,
    formatted_address: tour.formatted_address,
    website: tour.website,
    latitude: tour.latitude,
    longitude: tour.longitude,
    rating: tour.rating,
    user_ratings_total: tour.user_ratings_total,
    photos: tour.photos,
    types: tour.types,
    review_summary: tour.review_summary,
    maps_url: tour.maps_url,
    place_id: tour.place_id,
    images: tour.images,
    timings: tour.timings,
    currency: tour.currency,
    markup: tour.markup,
    created_by: user.id,
    dmc_id: user.dmc.id,
  };

  // Remove undefined fields
  Object.keys(tourData).forEach(
    (key) => tourData[key as keyof typeof tourData] === undefined && delete tourData[key as keyof typeof tourData]
  );

  const { data, error } = await supabase.from("tours").insert(tourData).select().single();

  if (error) return { error: error.message };

  return { data };
};

export const updateTours = async (id: string, tour: any) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  // Only extract tour-level fields, exclude relations and nested data
  // Use null for clearable fields so Supabase updates them (undefined is ignored)
  const tourData: Record<string, any> = {
    tour_name: tour.tour_name,
    description: tour.description,
    cancellation_policy: tour.cancellation_policy,
    remarks: tour.remarks,
    preferred: tour.preferred,
    country: tour.country,
    state: tour.state || null,
    city: tour.city,
    formatted_address: tour.formatted_address,
    website: tour.website,
    latitude: tour.latitude ?? null, // Convert undefined to null so it can be cleared
    longitude: tour.longitude ?? null, // Convert undefined to null so it can be cleared
    rating: tour.rating ?? null,
    user_ratings_total: tour.user_ratings_total ?? null,
    photos: tour.photos,
    types: tour.types,
    review_summary: tour.review_summary,
    maps_url: tour.maps_url,
    place_id: tour.place_id,
    images: tour.images,
    timings: tour.timings,
    currency: tour.currency,
    markup: tour.markup,
    dmc_id: user.dmc.id,
  };

  // Remove undefined fields (but keep null values for clearable fields)
  Object.keys(tourData).forEach((key) => tourData[key] === undefined && delete tourData[key]);

  const { data, error } = await supabase
    .from("tours")
    .update(tourData)
    .eq("id", id)
    .eq("dmc_id", user.dmc.id)
    .select()
    .single();

  if (error) return { error: error.message };

  return { data };
};

export const deleteTours = async (id: string) => {
  const supabase = await createClient();

  try {
    // First, fetch the tour to get all image URLs
    const { data: tour, error: fetchError } = await supabase.from("tours").select("images").eq("id", id).single();

    if (fetchError) {
      console.error(`Error fetching tour for deletion: ${fetchError.message}`);
      return { error: fetchError.message };
    }

    // Delete all images from S3
    if (tour?.images && Array.isArray(tour.images) && tour.images.length > 0) {
      const deletePromises = tour.images.map(async (imageUrl: string) => {
        try {
          await removeFromS3(imageUrl);
        } catch (error) {
          console.error(`Failed to delete image from S3: ${imageUrl}`, error);
          // Continue even if individual image deletion fails
        }
      });

      await Promise.allSettled(deletePromises);
    }

    // Now delete the tour record
    const { error } = await supabase.from("tours").delete().eq("id", id);

    if (error) return { error: error.message };

    return { data: null };
  } catch (error) {
    console.error("Error in deleteTours:", error);
    return { error: "Failed to delete tour" };
  }
};

export const bulkDeleteTours = async (ids: string[]) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  try {
    // First, fetch all tours to get their image URLs
    const { data: tours, error: fetchError } = await supabase
      .from("tours")
      .select("id, images")
      .in("id", ids)
      .eq("dmc_id", user.dmc.id);

    if (fetchError) {
      console.error(`Error fetching tours for deletion: ${fetchError.message}`);
      return { error: fetchError.message };
    }

    // Collect all image URLs from all tours
    const allImageUrls: string[] = [];
    tours?.forEach((tour) => {
      if (tour.images && Array.isArray(tour.images)) {
        allImageUrls.push(...tour.images);
      }
    });

    // Delete all images from S3
    if (allImageUrls.length > 0) {
      const deletePromises = allImageUrls.map(async (imageUrl: string) => {
        try {
          await removeFromS3(imageUrl);
        } catch (error) {
          console.error(`Failed to delete image from S3: ${imageUrl}`, error);
          // Continue even if individual image deletion fails
        }
      });

      await Promise.allSettled(deletePromises);
    }

    // Now delete the tour records
    const { error } = await supabase.from("tours").delete().in("id", ids).eq("dmc_id", user.dmc.id);

    if (error) return { error: error.message };

    return { data: null };
  } catch (error) {
    console.error("Error in bulkDeleteTours:", error);
    return { error: "Failed to delete tours" };
  }
};

/**
 * Prepare tour data for duplication
 * - Fetches full tour data
 * - Copies all images to new S3 locations
 * - Strips all IDs
 * - Returns prepared data ready for form
 */
export const prepareTourDuplicate = async (tourId: string) => {
  const { copyS3Images } = await import("@/lib/s3-upload");

  const user = await getCurrentUser();
  if (!user) return { data: null, error: "User not found" };

  // Fetch full tour data
  const { data: tourData, error: fetchError } = await getTourById(tourId);
  if (fetchError || !tourData) {
    return { data: null, error: fetchError || "Tour not found" };
  }

  try {
    // Deep clone to avoid mutations
    const duplicatedData = JSON.parse(JSON.stringify(tourData));

    // Remove fields that shouldn't be duplicated
    delete duplicatedData.id;
    delete duplicatedData.created_at;
    delete duplicatedData.updated_at;
    delete duplicatedData.countries;
    delete duplicatedData.cities;
    delete duplicatedData.country_name;
    delete duplicatedData.city_name;
    delete duplicatedData.tour_datastore_id;
    delete duplicatedData.is_unlinked;

    // Add "(Copy)" suffix to tour name
    if (duplicatedData.tour_name) {
      duplicatedData.tour_name = `${duplicatedData.tour_name} (Copy)`;
    }

    // Copy tour-level images
    if (duplicatedData.images && duplicatedData.images.length > 0) {
      duplicatedData.images = await copyS3Images(duplicatedData.images, user.id, "tours/");
    }

    // Process packages - remove IDs and copy images
    if (duplicatedData.packages && Array.isArray(duplicatedData.packages)) {
      duplicatedData.packages = await Promise.all(
        duplicatedData.packages.map(async (pkg: any) => {
          // Remove package IDs
          const {
            id: _pkgId,
            tour_id: _tourId,
            tour_package_datastore_id: _tourPackageDatastoreId,
            is_unlinked: _isUnlinked,
            ...pkgWithoutId
          } = pkg;

          // Copy package images
          if (pkgWithoutId.images && pkgWithoutId.images.length > 0) {
            pkgWithoutId.images = await copyS3Images(pkgWithoutId.images, user.id, "tour-packages/");
          }

          // Remove IDs from seasons
          if (pkgWithoutId.seasons && Array.isArray(pkgWithoutId.seasons)) {
            pkgWithoutId.seasons = pkgWithoutId.seasons.map((season: any) => {
              const { id: _seasonId, tour_package_id: _pkgRef, ...seasonWithoutId } = season;
              return seasonWithoutId;
            });
          }

          // Remove IDs from selected_add_ons (these are junction table references)
          if (pkgWithoutId.selected_add_ons && Array.isArray(pkgWithoutId.selected_add_ons)) {
            pkgWithoutId.selected_add_ons = pkgWithoutId.selected_add_ons.map((addOn: any) => {
              const { id: _id, package_id: _pkgId, ...addOnWithoutId } = addOn;
              return addOnWithoutId;
            });
          }

          return pkgWithoutId;
        })
      );
    }

    // Process add_ons - remove IDs and copy images
    if (duplicatedData.add_ons && Array.isArray(duplicatedData.add_ons)) {
      duplicatedData.add_ons = await Promise.all(
        duplicatedData.add_ons.map(async (addOn: any) => {
          const {
            id: _addOnId,
            tour_id: _tourId,
            tour_add_on_datastore_id: _tourAddOnDatastoreId,
            is_unlinked: isUnlinked,
            ...addOnWithoutId
          } = addOn;

          // Copy add-on images
          if (addOnWithoutId.images && addOnWithoutId.images.length > 0) {
            addOnWithoutId.images = await copyS3Images(addOnWithoutId.images, user.id, "tour-addons/");
          }

          return addOnWithoutId;
        })
      );
    }

    // Ensure JSONB fields have defaults
    if (!duplicatedData.pvt_rate) duplicatedData.pvt_rate = {};
    if (!duplicatedData.seasons) duplicatedData.seasons = [];
    if (!duplicatedData.images) duplicatedData.images = [];
    if (!duplicatedData.timings) duplicatedData.timings = [];
    if (!duplicatedData.types) duplicatedData.types = [];

    return { data: duplicatedData, error: null };
  } catch (error) {
    console.error("Error preparing tour duplicate:", error);
    return { data: null, error: "Failed to prepare duplicate" };
  }
};

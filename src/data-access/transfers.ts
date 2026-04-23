"use server";

import { ITransfersDatastore } from "@/components/forms/schemas/transfers-datastore-schema";
import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";
import { DatastoreSearchParams } from "@/types/datastore";
import { removeFromS3 } from "@/lib/s3-upload";
import { SupplierAssociation } from "@/types/suppliers";

export const getAllTransfersByUser = async (params: DatastoreSearchParams) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], totalItems: 0 };

  const { sort, country, city, perPage = 100, page = 1, currency, transfer_name: transferName } = params;

  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const query = supabase
    .from("transfers")
    .select(
      `
      *,
      countries!transfers_country_fkey(country_name),
      cities!transfers_city_fkey(city_name),
      transfer_packages!transfer_packages_transfer_id_fkey(
        *,
        transfer_package_add_ons!transfer_package_add_ons_transfer_package_id_fkey(
          transfer_add_on_id,
          is_mandatory,
          transfer_add_ons!transfer_package_add_ons_transfer_add_on_id_fkey(*)
        )
      ),
      transfer_add_ons!transfer_add_ons_transfer_id_fkey(*)
    `,
      { count: "exact" }
    )
    // .order("order", { referencedTable: "transfer_packages", ascending: true })
    .eq("dmc_id", user.dmc.id)
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    })
    .limit(perPage)
    .range(start, end);

  if (country?.length > 0) query.ilikeAnyOf("country", country);
  if (city?.length > 0) query.ilikeAnyOf("city", city);
  if (currency?.length > 0) query.ilikeAnyOf("currency", currency);
  if (transferName) query.ilike("transfer_name", `%${transferName}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching transfers for user ${user.id}: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item: any) => ({
      ...item,
      country_name: item.countries?.country_name || "N/A",
      city_name: item.cities?.city_name || "N/A",
      packages:
        item.transfer_packages?.map((pkg: any) => ({
          ...pkg,
          selected_add_ons:
            pkg.transfer_package_add_ons?.map((addOnMapping: any) => ({
              ...addOnMapping.transfer_add_ons,
              is_mandatory: addOnMapping.is_mandatory,
            })) || [],
        })) || [],
      add_ons: item.transfer_add_ons || [],
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
};

/**
 * Search transfer packages from vw_transfers_packages view
 * Used in add-activity-popover for selecting transfer packages
 */
export const searchTransferPackages = async (params: { query?: string; limit?: number }) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [] };

  const { query, limit = 20 } = params;

  let dbQuery = supabase
    .from("vw_transfers_packages")
    .select(
      "id, transfer_id, transfer_name, package_name, package_description, package_preferred, duration, mode, route, country, city"
    )
    .eq("dmc_id", user.dmc.id)
    .limit(limit);

  if (query) {
    dbQuery = dbQuery.or(`package_name.ilike.%${query}%,transfer_name.ilike.%${query}%`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error(`Error searching transfer packages: ${error.message}`);
    return { data: [] };
  }

  return { data: data || [] };
};

export const getTransferById = async (id: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: null, error: "User not found" };

  const { data, error } = await supabase
    .from("transfers")
    .select(
      `
      *,
      countries!transfers_country_fkey(country_name),
      cities!transfers_city_fkey(city_name),
      transfer_packages!transfer_packages_transfer_id_fkey(
        *,
        transfer_package_add_ons!transfer_package_add_ons_transfer_package_id_fkey(
          transfer_add_on_id,
          is_mandatory,
          transfer_add_ons!transfer_package_add_ons_transfer_add_on_id_fkey(*)
        )
      ),
      transfer_add_ons!transfer_add_ons_transfer_id_fkey(*),
      supplier_items:rategen_supplier_items(
        id,
        supplier_id,
        transfer_package_id,
        supplier:rategen_suppliers(name, is_active),
        pocs:rategen_supplier_item_pocs(team_member_id, is_primary)
      )
    `
    )
    .eq("id", id)
    .eq("dmc_id", (user as any).dmc.id)
    .single();

  if (error) {
    console.error(`Error fetching transfer ${id}: ${error.message}`);
    return { data: null, error: error.message };
  }

  const packages =
    data.transfer_packages?.map((pkg: any) => ({
      ...pkg,
      selected_add_ons:
        pkg.transfer_package_add_ons?.map((addOnMapping: any) => ({
          ...addOnMapping.transfer_add_ons,
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
      if (item.transfer_package_id && !acc[sid].package_ids.includes(item.transfer_package_id)) {
        acc[sid].package_ids.push(item.transfer_package_id);
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
    add_ons: data.transfer_add_ons || [],
    supplier_associations: supplierAssociations,
  };

  return { data: transformedData, error: null };
};

/**
 * Get a single transfer package by ID with all related data
 */
export const getTransferPackageById = async (packageId: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: null, error: "User not found" };

  const { data, error } = await supabase
    .from("transfer_packages")
    .select(
      `
      *,
      transfers!transfer_packages_transfer_id_fkey(transfer_name)
    `
    )
    .eq("id", packageId)
    .single();

  if (error || !data) {
    console.error(`Error fetching transfer package ${packageId}: ${error?.message || "Package not found"}`);
    return { data: null, error: error?.message || "Package not found" };
  }

  // Transform data to match expected format
  const transformedData = {
    ...data,
    transfer_name: data.transfers?.transfer_name || null,
  };

  return { data: transformedData, error: null };
};

export const createTransfer = async (transfer: any) => {
  const supabase = await createClient();

  const user = await getCurrentUser();

  if (!user) return { error: "User not found" };

  delete transfer.cities;
  delete transfer.countries;
  delete transfer.country_name;
  delete transfer.city_name;
  delete transfer.packages;
  delete transfer.transfer_packages;
  delete transfer.add_ons;
  delete transfer.transfer_add_ons;

  const { data, error } = await supabase
    .from("transfers")
    .insert({
      ...transfer,
      state: transfer.state || null,
      created_by: user.id,
      dmc_id: user.dmc.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  return { data };
};

export const updateTransfer = async (id: string, transfer: ITransfersDatastore) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const sanitizedData: any = { ...transfer };

  delete sanitizedData.cities;
  delete sanitizedData.countries;
  delete sanitizedData.country_name;
  delete sanitizedData.city_name;
  delete sanitizedData.packages;
  delete sanitizedData.transfer_packages;
  delete sanitizedData.add_ons;
  delete sanitizedData.transfer_add_ons;
  delete sanitizedData.supplier_items;
  delete sanitizedData.supplier_associations;

  const { data, error } = await supabase
    .from("transfers")
    .update({
      ...sanitizedData,
      state: sanitizedData.state || null,
    })
    .eq("id", id)
    .eq("dmc_id", user.dmc.id)
    .select()
    .single();

  if (error) return { error: error.message };

  return { data };
};

export const deleteTransfer = async (id: string) => {
  const supabase = await createClient();

  try {
    // First, fetch the transfer to get all image URLs
    const { data: transfer, error: fetchError } = await supabase
      .from("transfers")
      .select("images")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error(`Error fetching transfer for deletion: ${fetchError.message}`);
      return { error: fetchError.message };
    }

    // Delete all images from S3
    if (transfer?.images && Array.isArray(transfer.images) && transfer.images.length > 0) {
      const deletePromises = transfer.images.map(async (imageUrl: string) => {
        try {
          await removeFromS3(imageUrl);
        } catch (error) {
          console.error(`Failed to delete image from S3: ${imageUrl}`, error);
          // Continue even if individual image deletion fails
        }
      });

      await Promise.allSettled(deletePromises);
    }

    // Now delete the transfer record
    const { error } = await supabase.from("transfers").delete().eq("id", id);

    if (error) return { error: error.message };

    return { data: null };
  } catch (error) {
    console.error("Error in deleteTransfer:", error);
    return { error: "Failed to delete transfer" };
  }
};

export const bulkDeleteTransfers = async (ids: string[]) => {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return { error: "User not found" };

  try {
    // First, fetch all transfers to get their image URLs
    const { data: transfers, error: fetchError } = await supabase
      .from("transfers")
      .select("id, images")
      .in("id", ids)
      .eq("dmc_id", user.dmc.id);

    if (fetchError) {
      console.error(`Error fetching transfers for deletion: ${fetchError.message}`);
      return { error: fetchError.message };
    }

    // Collect all image URLs from all transfers
    const allImageUrls: string[] = [];
    transfers?.forEach((transfer) => {
      if (transfer.images && Array.isArray(transfer.images)) {
        allImageUrls.push(...transfer.images);
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

    // Now delete the transfer records
    const { error } = await supabase.from("transfers").delete().in("id", ids).eq("dmc_id", user.dmc.id);

    if (error) return { error: error.message };

    return { data: null };
  } catch (error) {
    console.error("Error in bulkDeleteTransfers:", error);
    return { error: "Failed to delete transfers" };
  }
};

/**
 * Prepare transfer data for duplication
 * - Fetches full transfer data
 * - Copies all images to new S3 locations
 * - Strips all IDs
 * - Returns prepared data ready for form
 */
export const prepareTransferDuplicate = async (
  transferId: string,
  { withNewClientIds = false }: { withNewClientIds?: boolean } = {}
) => {
  const { copyS3Images } = await import("@/lib/s3-upload");

  const user = await getCurrentUser();
  if (!user) return { data: null, error: "User not found" };

  // Fetch full transfer data
  const { data: transferData, error: fetchError } = await getTransferById(transferId);
  if (fetchError || !transferData) {
    return { data: null, error: fetchError || "Transfer not found" };
  }

  try {
    // Deep clone to avoid mutations
    const duplicatedData = JSON.parse(JSON.stringify(transferData));

    // Remove or update fields that shouldn't be duplicated
    delete duplicatedData.id;
    if (withNewClientIds) duplicatedData.id = crypto.randomUUID();
    delete duplicatedData.created_at;
    delete duplicatedData.updated_at;
    delete duplicatedData.countries;
    delete duplicatedData.cities;
    delete duplicatedData.country_name;
    delete duplicatedData.city_name;
    delete duplicatedData.transfer_datastore_id;
    delete duplicatedData.is_unlinked;

    // Add "(Copy)" suffix to transfer name
    if (duplicatedData.transfer_name) {
      duplicatedData.transfer_name = `${duplicatedData.transfer_name} (Copy)`;
    }

    // Copy transfer-level images
    if (duplicatedData.images && duplicatedData.images.length > 0) {
      duplicatedData.images = await copyS3Images(duplicatedData.images, user.id, "transfers/");
    }

    const addOnOldNewIdsMap = new Map<string, string>();

    // Process add_ons - remove IDs and copy images
    if (duplicatedData.add_ons && Array.isArray(duplicatedData.add_ons)) {
      duplicatedData.add_ons = await Promise.all(
        duplicatedData.add_ons.map(async (addOn: any) => {
          const {
            id: _addOnId,
            transfer_id: _transferId,
            transfer_add_on_datastore_id: _transferAddOnDatastoreId,
            is_unlinked: _isUnlinked,
            ...restAddOn
          } = addOn;

          if (withNewClientIds) {
            restAddOn.id = crypto.randomUUID();
            restAddOn.transfer_id = duplicatedData.id;
            addOnOldNewIdsMap.set(_addOnId, restAddOn.id);
          }

          // Copy add-on images
          if (restAddOn.images && restAddOn.images.length > 0) {
            restAddOn.images = await copyS3Images(restAddOn.images, user.id, "transfer-addons/");
          }

          return restAddOn;
        })
      );
    }

    // Process packages - remove IDs and copy images
    if (duplicatedData.packages && Array.isArray(duplicatedData.packages)) {
      duplicatedData.packages = await Promise.all(
        duplicatedData.packages.map(async (pkg: any) => {
          // Remove package IDs
          const {
            id: _pkgId,
            transfer_id: _transferId,
            transfer_package_datastore_id: _transferPackageDatastoreId,
            is_unlinked: _isUnlinked,
            ...restPackage
          } = pkg;

          if (withNewClientIds) {
            restPackage.id = crypto.randomUUID();
            restPackage.transfer_id = duplicatedData.id;
          }

          // Copy package images
          if (restPackage.images && restPackage.images.length > 0) {
            restPackage.images = await copyS3Images(restPackage.images, user.id, "transfer-packages/");
          }

          // Remove IDs from seasons
          if (restPackage.seasons && Array.isArray(restPackage.seasons)) {
            restPackage.seasons = restPackage.seasons.map((season: any) => {
              const { id: _seasonId, transfer_package_id: _pkgRef, ...restSeason } = season;
              // new client ids not needed for seasons
              return restSeason;
            });
          }

          // Remove IDs from selected_add_ons (these are junction table references)
          if (restPackage.selected_add_ons && Array.isArray(restPackage.selected_add_ons)) {
            restPackage.selected_add_ons = restPackage.selected_add_ons.map((selectedAddOn: any) => {
              const { id: _id, transfer_package_id: _pkgId, ...restSelectedAddOn } = selectedAddOn;
              if (withNewClientIds) {
                restSelectedAddOn.id = addOnOldNewIdsMap.get(_id) || _id;
                restSelectedAddOn.transfer_package_id = restPackage.id;
              }
              return restSelectedAddOn;
            });
          }

          return restPackage;
        })
      );
    }

    // Ensure JSONB fields have defaults
    if (!duplicatedData.images) duplicatedData.images = [];

    return { data: duplicatedData, error: null };
  } catch (error) {
    console.error("Error preparing transfer duplicate:", error);
    return { data: null, error: "Failed to prepare duplicate" };
  }
};

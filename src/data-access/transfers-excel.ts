"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";
import { Transfer } from "@/types/transfers";

interface BulkSaveOptions {
  transfers: Transfer[];
  syncedColumns: string[];
  originalTransferIds?: string[];
  originalPackageIdsByTransfer?: Record<string, string[]>;
  originalAddonIdsByTransfer?: Record<string, string[]>;
  // For chunked saves: pass all current IDs so deletions work correctly
  allCurrentTransferIds?: string[];
  allCurrentPackageIdsByTransfer?: Record<string, string[]>;
  allCurrentAddonIdsByTransfer?: Record<string, string[]>;
}

const TRANSFER_REQUIRED_KEYS = new Set(["id", "dmc_id", "created_by"]);
const PACKAGE_REQUIRED_KEYS = new Set(["id", "transfer_id"]);
const ADDON_REQUIRED_KEYS = new Set(["id", "transfer_id"]);

/** Filter out synced columns from an item, keeping required keys intact. */
function omitSyncedColumns<T extends Record<string, any>>(
  item: T,
  requiredKeys: Set<string>,
  prefix: string,
  syncedColumnsSet: Set<string>
): T {
  return Object.fromEntries(
    Object.entries(item).filter(([key]) => requiredKeys.has(key) || !syncedColumnsSet.has(`${prefix}.${key}`))
  ) as T;
}

/**
 * Upsert/update items to a table, handling linked items (with omitted synced columns) correctly.
 *
 * PostgreSQL validates NOT NULL constraints on the INSERT portion of an upsert
 * BEFORE checking ON CONFLICT — so even if a row exists, omitted NOT NULL columns
 * cause errors. To fix this:
 *   - Non-linked items: batch UPSERT (all columns present, safe for INSERT path)
 *   - Linked items: individual UPDATE (skips INSERT entirely, only touches provided columns)
 */
async function safeUpsert(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  items: { data: Record<string, any>; isLinked: boolean }[]
): Promise<{ error?: string }> {
  const nonLinked = items.filter((i) => !i.isLinked).map((i) => i.data);
  const linked = items.filter((i) => i.isLinked).map((i) => i.data);

  // Non-linked: batch upsert (has all columns, INSERT path is safe)
  if (nonLinked.length > 0) {
    const { error } = await supabase.from(table).upsert(nonLinked, { onConflict: "id" });
    if (error) return { error: error.message };
  }

  // Linked: individual updates (they already exist in DB, avoids INSERT NOT NULL issues)
  if (linked.length > 0) {
    const results = await Promise.all(linked.map(({ id, ...data }) => supabase.from(table).update(data).eq("id", id)));
    const failed = results.find((r) => r.error);
    if (failed?.error) return { error: failed.error.message };
  }

  return {};
}

/**
 * Bulk save transfers from the Excel editor using UPSERT
 * All IDs are real UUIDs (generated client-side)
 * Handles inserts, updates, and deletions for transfers, packages, addons,
 * and the transfer_package_add_ons junction table (via selected_add_ons on packages)
 */
export async function bulkSaveTransfersExcel(options: BulkSaveOptions) {
  const {
    transfers,
    syncedColumns,
    originalTransferIds = [],
    originalPackageIdsByTransfer = {},
    originalAddonIdsByTransfer = {},
    allCurrentTransferIds,
    allCurrentPackageIdsByTransfer,
    allCurrentAddonIdsByTransfer,
  } = options;

  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return { error: "User not found" };

  // synced columns set
  const syncedColumnsSet = new Set(syncedColumns);

  try {
    // ========== UPSERT / UPDATE TRANSFERS ==========
    if (transfers.length > 0) {
      const transferItems = transfers.map((transfer) => {
        const updateItem = {
          id: transfer.id,
          dmc_id: user.dmc.id,
          created_by: user.id,
          transfer_name: transfer.transfer_name || "",
          description: transfer.description || "",
          country: transfer.country || "",
          state: transfer.state || null,
          city: transfer.city || "",
          currency: transfer.currency || "",
          mode: transfer.mode || null,
          preferred: transfer.preferred ?? false,
          markup: transfer.markup ?? 0,
          examples: transfer.examples || "",
          cancellation_policy: transfer.cancellation_policy || "",
          child_policy: transfer.child_policy || "",
          remarks: transfer.remarks || "",
          images: transfer.images || [],
          updated_at: new Date().toISOString(),
        };

        const isLinked = !!transfer.transfer_datastore_id && !transfer.is_unlinked;
        return {
          data: isLinked
            ? omitSyncedColumns(updateItem, TRANSFER_REQUIRED_KEYS, "transfer", syncedColumnsSet)
            : updateItem,
          isLinked,
        };
      });

      const { error: transferError } = await safeUpsert(supabase, "transfers", transferItems);
      if (transferError) {
        return { error: `Failed to save transfers: ${transferError}` };
      }
    }

    // ========== COLLECT & SAVE ALL PACKAGES ==========
    const allPackageItems: { data: Record<string, any>; isLinked: boolean }[] = [];

    for (const transfer of transfers) {
      if (transfer.packages && transfer.packages.length > 0) {
        for (const pkg of transfer.packages) {
          if (!pkg.id) continue;

          const updateItem = {
            id: pkg.id,
            transfer_id: transfer.id!,
            name: pkg.name || "",
            description: pkg.description || "",
            remarks: pkg.remarks || "",
            notes: pkg.notes || "",
            child_policy: pkg.child_policy || null,
            preferred: pkg.preferred || false,
            iscombo: pkg.iscombo || false,
            order: pkg.order || 0,
            origin: pkg.origin || "",
            destination: pkg.destination || "",
            via: pkg.via || "",
            num_stops: pkg.num_stops || null,
            duration: pkg.duration || null,
            inclusions: pkg.inclusions || "",
            exclusions: pkg.exclusions || "",
            meeting_point: pkg.meeting_point || "",
            pickup_point: pkg.pickup_point || "",
            dropoff_point: pkg.dropoff_point || "",
            images: pkg.images || [],
            operational_hours: pkg.operational_hours || [],
            transfer_type: pkg.transfer_type || [],
            seasons: (pkg.seasons || []).map((season) => ({
              ...season,
              per_vehicle_rate: (season.per_vehicle_rate || []).filter((el) => el.rate != null),
              pvt_rate: season.pvt_rate
                ? Object.fromEntries(Object.entries(season.pvt_rate).filter(([, v]) => v != null))
                : undefined,
            })),
          };

          const isLinked = !!pkg.transfer_package_datastore_id && !pkg.is_unlinked;
          allPackageItems.push({
            data: isLinked
              ? omitSyncedColumns(updateItem, PACKAGE_REQUIRED_KEYS, "transfer_package", syncedColumnsSet)
              : updateItem,
            isLinked,
          });
        }
      }
    }

    if (allPackageItems.length > 0) {
      const { error: packageError } = await safeUpsert(supabase, "transfer_packages", allPackageItems);
      if (packageError) {
        return { error: `Failed to save packages: ${packageError}` };
      }
    }

    // ========== COLLECT & SAVE ALL ADDONS ==========
    const allAddonItems: { data: Record<string, any>; isLinked: boolean }[] = [];

    for (const transfer of transfers) {
      if (transfer.add_ons && transfer.add_ons.length > 0) {
        for (const addon of transfer.add_ons) {
          if (!addon.id) continue;

          const updateItem = {
            id: addon.id,
            transfer_id: transfer.id!,
            name: addon.name || "",
            description: addon.description || "",
            is_mandatory: addon.is_mandatory || false,
            age_policy: addon.age_policy || {},
            remarks: addon.remarks || "",
            notes: addon.notes || "",
            rate_adult: addon.rate_adult || null,
            rate_child: addon.rate_child || null,
            rate_teenager: addon.rate_teenager || null,
            rate_infant: addon.rate_infant || null,
            total_rate: addon.total_rate || null,
            max_participants: addon.max_participants || null,
            images: addon.images || [],
          };

          const isLinked = !!addon.transfer_add_on_datastore_id && !addon.is_unlinked;
          allAddonItems.push({
            data: isLinked
              ? omitSyncedColumns(updateItem, ADDON_REQUIRED_KEYS, "transfer_add_on", syncedColumnsSet)
              : updateItem,
            isLinked,
          });
        }
      }
    }

    if (allAddonItems.length > 0) {
      const { error: addonError } = await safeUpsert(supabase, "transfer_add_ons", allAddonItems);
      if (addonError) {
        return { error: `Failed to save addons: ${addonError}` };
      }
    }

    // ========== SYNC JUNCTION TABLE (transfer_package_add_ons) ==========
    // Strategy: For each package in this chunk, delete existing junction rows
    // and re-insert from selected_add_ons. This is safe because:
    //   - The junction table only has (transfer_package_id, transfer_add_on_id, is_mandatory)
    //   - DB auto-generates the id via gen_random_uuid()
    //   - The unique constraint is on (transfer_package_id, transfer_add_on_id)

    // Collect all package IDs in this chunk
    const packageIdsInChunk: string[] = [];
    for (const transfer of transfers) {
      if (transfer.packages && transfer.packages.length > 0) {
        for (const pkg of transfer.packages) {
          if (pkg.id) packageIdsInChunk.push(pkg.id);
        }
      }
    }

    // Delete existing junction entries for all packages in this chunk
    if (packageIdsInChunk.length > 0) {
      const { error: deleteJunctionError } = await supabase
        .from("transfer_package_add_ons")
        .delete()
        .in("transfer_package_id", packageIdsInChunk);

      if (deleteJunctionError) {
        return { error: `Failed to clear junction entries: ${deleteJunctionError.message}` };
      }
    }

    // Collect new junction entries from selected_add_ons
    const allJunctionEntries: Array<{
      transfer_package_id: string;
      transfer_add_on_id: string;
      is_mandatory: boolean;
    }> = [];

    for (const transfer of transfers) {
      if (transfer.packages && transfer.packages.length > 0) {
        for (const pkg of transfer.packages) {
          if (!pkg.id) continue;

          // selected_add_ons comes from the query as:
          //   { id: "addon-uuid", name: "...", is_mandatory: true/false, ... }
          // or can be a plain string "addon-uuid"
          const selectedAddOns = (pkg as any).selected_add_ons || [];
          for (const addOn of selectedAddOns) {
            let addOnId: string;
            let isMandatory = false;

            if (typeof addOn === "string") {
              addOnId = addOn;
            } else if (addOn && typeof addOn === "object" && addOn.id) {
              addOnId = addOn.id;
              isMandatory = addOn.is_mandatory || false;
            } else {
              continue;
            }

            allJunctionEntries.push({
              transfer_package_id: pkg.id,
              transfer_add_on_id: addOnId,
              is_mandatory: isMandatory,
            });
          }
        }
      }
    }

    // Insert new junction entries (DB auto-generates id)
    if (allJunctionEntries.length > 0) {
      const { error: junctionInsertError } = await supabase.from("transfer_package_add_ons").insert(allJunctionEntries);

      if (junctionInsertError) {
        return { error: `Failed to save package add-on mappings: ${junctionInsertError.message}` };
      }
    }

    // ========== DELETE REMOVED TRANSFERS ==========
    // Use allCurrentTransferIds if provided (for chunked saves), otherwise use current chunk's transfer IDs
    const currentTransferIds = new Set(allCurrentTransferIds || transfers.map((t) => t.id));
    const transfersToDelete = originalTransferIds.filter((id) => !currentTransferIds.has(id));

    if (transfersToDelete.length > 0) {
      // First delete packages and addons for these transfers
      await supabase.from("transfer_packages").delete().in("transfer_id", transfersToDelete);
      await supabase.from("transfer_add_ons").delete().in("transfer_id", transfersToDelete);

      // Then delete the transfers
      const { error: deleteTransfersError } = await supabase
        .from("transfers")
        .delete()
        .in("id", transfersToDelete)
        .eq("dmc_id", user.dmc.id);

      if (deleteTransfersError) {
        return { error: `Failed to delete transfers: ${deleteTransfersError.message}` };
      }
    }

    // ========== DELETE REMOVED PACKAGES ==========
    // Use allCurrentPackageIdsByTransfer if provided (for chunked saves)
    const currentPackageIdsByTransfer = new Map<string, Set<string>>();
    if (allCurrentPackageIdsByTransfer) {
      // Use the full list from all chunks
      for (const [transferId, packageIds] of Object.entries(allCurrentPackageIdsByTransfer)) {
        currentPackageIdsByTransfer.set(transferId, new Set(packageIds));
      }
    } else {
      // Use current chunk's package IDs
      for (const transfer of transfers) {
        const packageIds = new Set<string>();
        transfer.packages?.forEach((pkg) => {
          if (pkg.id) packageIds.add(pkg.id);
        });
        currentPackageIdsByTransfer.set(transfer.id!, packageIds);
      }
    }

    for (const [transferId, originalPackageIds] of Object.entries(originalPackageIdsByTransfer)) {
      // Skip if transfer was deleted
      if (transfersToDelete.includes(transferId)) continue;

      const currentIds = currentPackageIdsByTransfer.get(transferId);
      if (!currentIds) continue;

      const packagesToDelete = originalPackageIds.filter((id) => !currentIds.has(id));
      if (packagesToDelete.length > 0) {
        // Junction entries auto-cascade when packages are deleted
        await supabase.from("transfer_packages").delete().in("id", packagesToDelete).eq("transfer_id", transferId);
      }
    }

    // ========== DELETE REMOVED ADDONS ==========
    // Use allCurrentAddonIdsByTransfer if provided (for chunked saves)
    const currentAddonIdsByTransfer = new Map<string, Set<string>>();
    if (allCurrentAddonIdsByTransfer) {
      // Use the full list from all chunks
      for (const [transferId, addonIds] of Object.entries(allCurrentAddonIdsByTransfer)) {
        currentAddonIdsByTransfer.set(transferId, new Set(addonIds));
      }
    } else {
      // Use current chunk's addon IDs
      for (const transfer of transfers) {
        const addonIds = new Set<string>();
        transfer.add_ons?.forEach((addon) => {
          if (addon.id) addonIds.add(addon.id);
        });
        currentAddonIdsByTransfer.set(transfer.id!, addonIds);
      }
    }

    for (const [transferId, originalAddonIds] of Object.entries(originalAddonIdsByTransfer)) {
      // Skip if transfer was deleted
      if (transfersToDelete.includes(transferId)) continue;

      const currentIds = currentAddonIdsByTransfer.get(transferId);
      if (!currentIds) continue;

      const addonsToDelete = originalAddonIds.filter((id) => !currentIds.has(id));
      if (addonsToDelete.length > 0) {
        // Junction entries auto-cascade when add-ons are deleted
        await supabase.from("transfer_add_ons").delete().in("id", addonsToDelete).eq("transfer_id", transferId);
      }
    }

    // ========== RETURN SAVED TRANSFERS ==========
    // Since we're using real UUIDs, the transfers already have correct IDs
    const savedTransfers = transfers.filter((t) => !transfersToDelete.includes(t.id!));

    return {
      data: {
        message: "All changes saved successfully",
        count: transfers.length,
        savedTransfers,
      },
    };
  } catch (error) {
    console.error("Error in bulkSaveTransfersExcel:", error);
    return { error: "Failed to save transfer data" };
  }
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Transfer, TransferPackage } from "@/types/transfers";
import { toast } from "sonner";

interface UseTransferExcelStateProps {
  transfers: Transfer[];
  isOpen: boolean;
}

export function useTransferExcelState({ transfers, isOpen }: UseTransferExcelStateProps) {
  const [editedTransfers, setEditedTransfers] = useState<Transfer[]>([]);
  const [addedVehicles, setAddedVehicles] = useState<
    { id: string; vehicle_type: string; brand: string; max_passengers: number | null; max_luggage: number | null }[]
  >([]);
  const [maxPvtRateColumns, setMaxPvtRateColumns] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Use ref for functional updates
  const transfersRef = useRef<Transfer[]>([]);
  transfersRef.current = editedTransfers;

  // Track if we've initialized for this dialog session
  const initializedRef = useRef(false);
  const wasOpenRef = useRef(false);

  // Track original IDs for deletion detection
  const [originalTransferIds, setOriginalTransferIds] = useState<string[]>([]);
  const [originalPackageIdsByTransfer, setOriginalPackageIdsByTransfer] = useState<Record<string, string[]>>({});
  const [originalAddonIdsByTransfer, setOriginalAddonIdsByTransfer] = useState<Record<string, string[]>>({});

  // Initialize state ONLY when dialog opens (transitions from closed to open)
  useEffect(() => {
    // Detect dialog opening (was closed, now open)
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    // Reset initialization tracking when dialog closes
    if (!isOpen) {
      initializedRef.current = false;
      return;
    }

    // Only initialize once when dialog opens
    if (justOpened && !initializedRef.current && transfers && Array.isArray(transfers)) {
      // Deep clone transfers
      const cloned = JSON.parse(JSON.stringify(transfers));
      setEditedTransfers(cloned);
      transfersRef.current = cloned;
      setHasChanges(false);
      initializedRef.current = true;

      // Track original IDs for deletion detection
      setOriginalTransferIds(transfers.map((t) => t.id!));
      const packageIds: Record<string, string[]> = {};
      const addonIds: Record<string, string[]> = {};
      transfers.forEach((t) => {
        if (t.packages && t.packages.length > 0) {
          packageIds[t.id!] = t.packages.map((r) => r.id!).filter(Boolean);
        }
        if (t.add_ons && t.add_ons.length > 0) {
          addonIds[t.id!] = t.add_ons.map((a) => a.id!).filter(Boolean);
        }
      });
      setOriginalPackageIdsByTransfer(packageIds);
      setOriginalAddonIdsByTransfer(addonIds);
    }
  }, [isOpen, transfers]);

  // Update a single transfer field
  const updateTransferField = useCallback((transferId: string, field: string, value: any) => {
    setEditedTransfers((prev) => {
      return prev.map((transfer) => {
        if (transfer.id === transferId) {
          return { ...transfer, [field]: value };
        }
        return transfer;
      });
    });
    setHasChanges(true);
  }, []);

  // Batch update multiple transfer fields at once (for bulk operations like delete)
  const batchUpdateTransferFields = useCallback((updates: Array<{ transferId: string; field: string; value: any }>) => {
    setEditedTransfers((prev) => {
      // Group updates by transferId
      const updatesByTransfer = new Map<string, Array<{ field: string; value: any }>>();
      updates.forEach(({ transferId, field, value }) => {
        if (!updatesByTransfer.has(transferId)) {
          updatesByTransfer.set(transferId, []);
        }
        updatesByTransfer.get(transferId)!.push({ field, value });
      });

      return prev.map((transfer) => {
        const transferUpdates = updatesByTransfer.get(transfer.id!);
        if (!transferUpdates) return transfer;

        let updatedTransfer = { ...transfer };
        transferUpdates.forEach(({ field, value }) => {
          updatedTransfer = { ...updatedTransfer, [field]: value };
        });
        return updatedTransfer;
      });
    });
    setHasChanges(true);
  }, []);

  // Update a package field
  const updatePackageField = useCallback((transferId: string, packageId: string, field: string, value: any) => {
    setEditedTransfers((prev) => {
      return prev.map((transfer) => {
        if (transfer.id === transferId && transfer.packages) {
          return {
            ...transfer,
            packages: transfer.packages.map((pkg) => {
              if (pkg.id === packageId) {
                return { ...pkg, [field]: value };
              }
              return pkg;
            }),
          };
        }
        return transfer;
      });
    });
    setHasChanges(true);
  }, []);

  // Update a season field (dates, sic_rate_adult, sic_rate_child, pvt_rate, or per_vehicle_rate)
  const updateSeasonField = useCallback(
    (transferId: string, packageId: string, seasonIndex: number, field: string, value: any) => {
      setEditedTransfers((prev) => {
        return prev.map((transfer) => {
          if (transfer.id !== transferId || !transfer.packages) return transfer;
          return {
            ...transfer,
            packages: transfer.packages.map((pkg) => {
              if (pkg.id !== packageId || !pkg.seasons) return pkg;
              return {
                ...pkg,
                seasons: pkg.seasons.map((season, idx) => {
                  if (idx !== seasonIndex) return season;
                  if (field === "sic_rate_adult" || field === "sic_rate_child" || field === "dates") {
                    return { ...season, [field]: value };
                  }
                  if (field === "pvt_rate") {
                    return { ...season, pvt_rate: value };
                  }
                  if (field === "per_vehicle_rate") {
                    return { ...season, per_vehicle_rate: value };
                  }
                  return season;
                }),
              };
            }),
          };
        });
      });
      setHasChanges(true);
    },
    []
  );

  const updateVehicleField = useCallback((sourceIds: string[], is_new: boolean, field: string, value: any) => {
    if (sourceIds.length === 0) return;
    if (is_new) {
      const id = sourceIds[0];
      setAddedVehicles((prev) => {
        return prev.map((vehicle) => {
          if (vehicle.id === id) {
            return { ...vehicle, [field]: value };
          }
          return vehicle;
        });
      });
    } else {
      const keySet = new Set(sourceIds);
      setEditedTransfers((prev) => {
        return prev.map((transfer) => {
          if (!transfer.packages) return transfer;
          return {
            ...transfer,
            packages: transfer.packages.map((pkg) => {
              if (!pkg.seasons) return pkg;
              return {
                ...pkg,
                seasons: pkg.seasons.map((season, seasonIndex) => ({
                  ...season,
                  per_vehicle_rate: season.per_vehicle_rate?.map((vehicle, vehicleIndex) => {
                    const key = `${transfer.id}:::${pkg.id}:::${seasonIndex}:::${vehicleIndex}`;
                    if (keySet.has(key)) {
                      return { ...vehicle, [field]: value };
                    }
                    return vehicle;
                  }),
                })),
              };
            }),
          };
        });
      });
    }
    setHasChanges(true);
  }, []);

  // Delete transfers by their IDs
  const deleteTransfers = useCallback((transferIds: string[]) => {
    setEditedTransfers((prev) => prev.filter((transfer) => !transferIds.includes(transfer.id!)));
    setHasChanges(true);
  }, []);

  // Track newly created IDs (for upsert - these don't exist in DB yet)
  const [newTransferIds, setNewTransferIds] = useState<Set<string>>(new Set());
  const [newPackageIds, setNewPackageIds] = useState<Set<string>>(new Set());

  // Add a new transfer (optionally after a specific transfer)
  const addTransfer = useCallback((afterTransferId?: string) => {
    const newTransferId = crypto.randomUUID();
    const newPackageId = crypto.randomUUID();
    setNewTransferIds((prev) => new Set(prev).add(newTransferId));
    setNewPackageIds((prev) => new Set(prev).add(newPackageId));
    setEditedTransfers((prev) => {
      // Create a default empty package
      const defaultPackage = {
        id: newPackageId,
        name: "",
        description: "",
        remarks: "", // AI Remarks
        notes: "", // For frontend and vouchers
        inclusions: "",
        exclusions: "",
        preferred: false,
        iscombo: false,
        order: 0,
        // Route Details
        origin: "",
        destination: "",
        num_stops: null,
        via: "",
        duration: null,
        // Location Points
        meeting_point: "",
        pickup_point: "",
        dropoff_point: "",
        // Other
        images: [],
        operational_hours: [],
        seasons: [],
        transfer_type: [],
        transfer_package_datastore_id: null,
        is_unlinked: false,
      };

      const newTransfer = {
        id: newTransferId,
        created_at: new Date().toISOString(),
        transfer_name: "",
        description: "",
        mode: null,
        preferred: false,
        markup: null,
        remarks: "", // AI Remarks
        currency: "",
        country: "",
        state: null,
        city: "",
        images: [],
        add_ons: [],
        packages: [defaultPackage],
        transfer_datastore_id: null,
        is_unlinked: false,
        is_unsaved: true,
      } as Transfer;

      if (afterTransferId) {
        const idx = prev.findIndex((t) => t.id === afterTransferId);
        if (idx !== -1) {
          const newList = [...prev];
          newList.splice(idx + 1, 0, newTransfer);
          return newList;
        }
      }
      // Add new transfer at the end (will be sorted by updated_at)
      return [...prev, newTransfer];
    });
    setHasChanges(true);
  }, []);

  // Duplicate an existing transfer with all its data (packages, seasons, add-ons)
  const duplicateTransfer = useCallback(
    (transferId: string) => {
      // 1️⃣ Read current state ONLY to decide the path
      const source = editedTransfers.find((t) => t.id === transferId);
      if (!source) return;

      // Helper: pure insert
      const insertAfterOrAppend = (prev: Transfer[], afterId: string, item: Transfer) => {
        const idx = prev.findIndex((t) => t.id === afterId);
        if (idx === -1) {
          return [...prev, item]; // append at the end
        }
        const next = [...prev];
        next.splice(idx + 1, 0, item);
        return next;
      };

      // Helper: pure clone for unsaved
      const buildUnsavedClone = (src: Transfer): Transfer => {
        const clone = JSON.parse(JSON.stringify(src)) as Transfer;

        const newTransferId = crypto.randomUUID();
        clone.id = newTransferId;
        clone.created_at = new Date().toISOString();
        clone.updated_at = clone.created_at;
        clone.transfer_name = `${clone.transfer_name} (Copy)`;
        clone.is_unsaved = true;

        const addOnOldNewIdsMap = new Map<string, string>();

        if (clone.add_ons?.length) {
          clone.add_ons = clone.add_ons.map((addOn: any) => {
            const newAddOnId = crypto.randomUUID();
            addOnOldNewIdsMap.set(addOn.id, newAddOnId);

            return {
              ...addOn,
              id: newAddOnId,
              transfer_id: newTransferId,
            };
          });
        }

        if (clone.packages?.length) {
          clone.packages = clone.packages.map((pkg: any) => ({
            ...pkg,
            id: crypto.randomUUID(),
            selected_add_ons: pkg.selected_add_ons?.map((selectedAddOn: any) => {
              return {
                ...selectedAddOn,
                id: addOnOldNewIdsMap.get(selectedAddOn.id),
                transfer_id: newTransferId,
              };
            }),
          }));
        }

        return clone;
      };

      // UNSAVED → sync path
      if (source.is_unsaved) {
        const clone = buildUnsavedClone(source);

        setEditedTransfers((prev) => insertAfterOrAppend(prev, transferId, clone));

        setNewTransferIds((p) => new Set(p).add(clone.id!));
        clone.packages?.forEach((pkg: any) => {
          setNewPackageIds((p) => new Set(p).add(pkg.id));
        });

        setHasChanges(true);
        return;
      }

      // SAVED → async path (outside updater)
      if (!source.is_unsaved) {
        (async () => {
          try {
            const { prepareTransferDuplicate } = await import("@/data-access/transfers");

            const { data: clone, error } = await prepareTransferDuplicate(transferId, { withNewClientIds: true });

            if (error || !clone) {
              toast.error(error ?? "Failed to duplicate transfer.");
              return;
            }

            // update created_at and updated_at only, ids are already updated
            clone.created_at = new Date().toISOString();
            clone.updated_at = clone.created_at;
            clone.is_unsaved = true;

            setEditedTransfers((prev) => insertAfterOrAppend(prev, transferId, clone));

            setNewTransferIds((p) => new Set(p).add(clone.id));
            clone.packages?.forEach((pkg: any) => {
              setNewPackageIds((p) => new Set(p).add(pkg.id));
            });

            setHasChanges(true);
          } catch {
            toast.error("Error duplicating transfer.");
          }
        })();
      }
    },
    [editedTransfers]
  );

  // Add a new packages to a transfer (optionally after a specific packages, with initial values)
  const addPackage = useCallback((transferId: string, afterPackageId?: string, initialValues?: Record<string, any>) => {
    const newId = crypto.randomUUID();
    setNewPackageIds((prev) => new Set(prev).add(newId));
    setEditedTransfers((prev) => {
      return prev.map((transfer) => {
        if (transfer.id === transferId) {
          // Create a default empty season
          const defaultSeason = {
            dates: "",
            sic_rate_adult: null,
            sic_rate_child: null,
            sic_max_luggage: null,
            sic_max_passengers: null,
            pvt_rate: {},
            per_vehicle_rate: [],
            exception_rules: "",
            order: 0,
          };

          const newPackage = {
            id: newId,
            transfer_id: transferId,
            name: "",
            description: "",
            remarks: "", // AI Remarks
            notes: "", // For frontend and vouchers
            inclusions: "",
            exclusions: "",
            preferred: false,
            iscombo: false,
            order: 0,
            // Route Details
            origin: "",
            destination: "",
            num_stops: null,
            via: "",
            duration: null,
            // Location Points
            meeting_point: "",
            pickup_point: "",
            dropoff_point: "",
            // Other
            images: [],
            operational_hours: [],
            seasons: [defaultSeason],
            // Transfer type (multiselect)
            transfer_type: [],
            transfer_package_datastore_id: null,
            is_unlinked: false,
            ...initialValues, // Apply any initial values passed in
          };

          const packages = transfer.packages || [];
          if (afterPackageId) {
            const idx = packages.findIndex((r) => r.id === afterPackageId);
            if (idx !== -1) {
              const newPackages = [...packages];
              newPackages.splice(idx + 1, 0, newPackage as TransferPackage);
              return { ...transfer, packages: newPackages };
            }
          }
          // Add new package at the end
          return {
            ...transfer,
            packages: [...packages, newPackage],
          };
        }
        return transfer;
      });
    });
    setHasChanges(true);
  }, []);

  // Delete packages by their composite IDs (transferId:::packageId)
  const deletePackages = useCallback(
    (compositeIds: string[]) => {
      // Check if deletion would leave any transfer with 0 packages
      const transfersRef = editedTransfers;
      for (const transfer of transfersRef) {
        const packagesIdsToDelete = compositeIds
          .filter((id) => id.startsWith(`${transfer.id}:::`))
          .map((id) => id.split(":::")[1]);

        if (packagesIdsToDelete.length > 0 && transfer.packages) {
          const remainingPackages = transfer.packages.filter((pkg) => !packagesIdsToDelete.includes(pkg.id!));
          if (remainingPackages.length === 0) {
            toast.error(
              `Cannot delete all packages. "${transfer.transfer_name || "Transfer"}" must have at least one package.`
            );
            return;
          }
        }
      }

      setEditedTransfers((prev) => {
        return prev.map((transfer) => {
          const packageIdsToDelete = compositeIds
            .filter((id) => id.startsWith(`${transfer.id}:::`))
            .map((id) => id.split(":::")[1]);

          if (packageIdsToDelete.length > 0 && transfer.packages) {
            return {
              ...transfer,
              packages: transfer.packages.filter((pkg) => !packageIdsToDelete.includes(pkg.id!)),
            };
          }
          return transfer;
        });
      });
      setHasChanges(true);
    },
    [editedTransfers]
  );

  const convertVehicleToDetailsString = useCallback(
    (vehicle: { vehicle_type: string; brand: string; max_passengers?: number | null; max_luggage?: number | null }) => {
      return `${vehicle.vehicle_type}:::${vehicle.brand}:::${
        vehicle.max_passengers !== undefined && (vehicle.max_passengers as unknown as string) !== ""
          ? vehicle.max_passengers
          : null
      }:::${
        vehicle.max_luggage !== undefined && (vehicle.max_luggage as unknown as string) !== ""
          ? vehicle.max_luggage
          : null
      }`;
    },
    []
  );

  const addVehicle = useCallback((afterVehicleId?: string, initialValues?: Record<string, any>) => {
    const newId = crypto.randomUUID();

    const newVehicle = {
      id: newId,
      vehicle_type: "",
      brand: "",
      max_passengers: null,
      max_luggage: null,
      ...initialValues,
    };
    // Insert the new vehicle into addedVehicles after the vehicle with afterVehicleId, otherwise at the end
    if (afterVehicleId) {
      setAddedVehicles((prev) => {
        const idx = prev.findIndex((r) => r.id === afterVehicleId);
        if (idx !== -1) {
          const newArr = [...prev];
          newArr.splice(idx + 1, 0, newVehicle);
          return newArr;
        }
        // If not found, append at end
        return [...prev, newVehicle];
      });
    } else {
      setAddedVehicles((prev) => [...prev, newVehicle]);
    }
    setHasChanges(true);
  }, []);

  const deleteVehicles = useCallback((ids: string[]) => {
    // Shallow clone of ids so we can mutate or iterate safely
    ids.forEach((id) => {
      // First, look for vehicle in addedVehicles (added but not yet saved)
      setAddedVehicles((prev) => {
        const idx = prev.findIndex((v) => v.id === id);
        if (idx !== -1) {
          const newArr = [...prev];
          newArr.splice(idx, 1);
          return newArr;
        }
        return prev;
      });

      // If not found in addedVehicles, it's a composite id for DB (transferId:::packageId:::seasonIdx:::vehicleIdx)
      // Attempt to parse the composite id
      const compositeParts = id.split(":::");
      if (compositeParts.length === 4) {
        const [transferId, packageId, seasonIdxStr, vehicleIdxStr] = compositeParts;
        const seasonIdx = parseInt(seasonIdxStr, 10);
        const vehicleIdx = parseInt(vehicleIdxStr, 10);

        setEditedTransfers((prevTransfers) => {
          return prevTransfers.map((transfer) => {
            if (transfer.id !== transferId || !transfer.packages) return transfer;

            return {
              ...transfer,
              packages: transfer.packages.map((pkg) => {
                if (pkg.id !== packageId || !pkg.seasons) return pkg;

                return {
                  ...pkg,
                  seasons: pkg.seasons.map((season, sidx) => {
                    if (sidx !== seasonIdx || !season.per_vehicle_rate) return season;

                    return {
                      ...season,
                      per_vehicle_rate: season.per_vehicle_rate.filter((_, vidx) => vidx !== vehicleIdx),
                    };
                  }),
                };
              }),
            };
          });
        });
      }
    });
    setHasChanges(true);
  }, []);

  // Add a new season to a package (optionally after a specific season index, with initial values)
  const addSeason = useCallback(
    (transferId: string, packageId: string, afterSeasonIndex?: number, initialValues?: Record<string, any>) => {
      setEditedTransfers((prev) => {
        return prev.map((transfer) => {
          if (transfer.id === transferId && transfer.packages) {
            return {
              ...transfer,
              packages: transfer.packages.map((pkg) => {
                if (pkg.id === packageId) {
                  // Create a default empty season
                  const newSeason = {
                    dates: "",
                    sic_rate_adult: null,
                    sic_rate_child: null,
                    sic_max_luggage: null,
                    sic_max_passengers: null,
                    pvt_rate: {},
                    per_vehicle_rate: [],
                    exception_rules: "",
                    order: 0,
                    ...initialValues, // Apply any initial values passed in
                  };

                  const seasons = pkg.seasons || [];
                  if (afterSeasonIndex !== undefined && afterSeasonIndex >= 0 && afterSeasonIndex < seasons.length) {
                    const newSeasons = [...seasons];
                    newSeasons.splice(afterSeasonIndex + 1, 0, newSeason);
                    return { ...pkg, seasons: newSeasons };
                  }
                  // Add new season at the end
                  return {
                    ...pkg,
                    seasons: [...seasons, newSeason],
                  };
                }
                return pkg;
              }),
            };
          }
          return transfer;
        });
      });
      setHasChanges(true);
    },
    []
  );

  // Delete seasons by their composite IDs (transferId:::packageId:::seasonIndex)
  const deleteSeasons = useCallback(
    (compositeIds: string[]) => {
      // Group by transfer and package
      const deleteMap = new Map<string, Map<string, number[]>>();
      compositeIds.forEach((id) => {
        const parts = id.split(":::");
        if (parts.length !== 3) return;
        const transferId = parts[0];
        const packageId = parts[1];
        const seasonIndex = parseInt(parts[2], 10);

        if (!deleteMap.has(transferId)) {
          deleteMap.set(transferId, new Map());
        }
        const packageMap = deleteMap.get(transferId)!;
        if (!packageMap.has(packageId)) {
          packageMap.set(packageId, []);
        }
        packageMap.get(packageId)!.push(seasonIndex);
      });

      // Validate that no package will be left with 0 seasons
      const transfersRef = editedTransfers;
      for (const transfer of transfersRef) {
        const packageMap = deleteMap.get(transfer.id!);
        if (!packageMap || !transfer.packages) continue;

        for (const pkg of transfer.packages) {
          const seasonIndices = packageMap.get(pkg.id!);
          if (!seasonIndices || !pkg.seasons) continue;

          const remainingSeasons = pkg.seasons.filter((_, idx) => !seasonIndices.includes(idx));
          if (remainingSeasons.length === 0) {
            toast.error(`Cannot delete all seasons. "${pkg.name || "Package"}" must have at least one season.`);
            return;
          }
        }
      }

      setEditedTransfers((prev) => {
        return prev.map((transfer) => {
          const packageMap = deleteMap.get(transfer.id!);
          if (!packageMap || !transfer.packages) return transfer;

          return {
            ...transfer,
            packages: transfer.packages.map((pkg) => {
              const seasonIndices = packageMap.get(pkg.id!);
              if (!seasonIndices || !pkg.seasons) return pkg;

              return {
                ...pkg,
                seasons: pkg.seasons.filter((_, idx) => !seasonIndices.includes(idx)),
              };
            }),
          };
        });
      });
      setHasChanges(true);
    },
    [editedTransfers]
  );

  // Reset to original data
  const resetChanges = useCallback(() => {
    if (transfers && Array.isArray(transfers)) {
      setEditedTransfers(JSON.parse(JSON.stringify(transfers)));
    }
    setAddedVehicles([]);
    setHasChanges(false);
  }, [transfers]);

  // Mark as saved
  const markAsSaved = useCallback(() => {
    setHasChanges(false);
  }, []);

  // Refresh state with saved transfers (after successful save)
  const refreshWithSavedData = useCallback((savedTransfers: Transfer[]) => {
    setEditedTransfers(savedTransfers);
    transfersRef.current = savedTransfers;
    setHasChanges(false);
    // Clear new ID tracking (all items are now saved in DB)
    setNewTransferIds(new Set());
    setNewPackageIds(new Set());
    // Update original IDs to reflect the new saved state
    setOriginalTransferIds(savedTransfers.map((t) => t.id!));
    const packageIds: Record<string, string[]> = {};
    const addonIds: Record<string, string[]> = {};
    savedTransfers.forEach((t) => {
      if (t.packages && t.packages.length > 0) {
        packageIds[t.id!] = t.packages.map((r) => r.id!).filter(Boolean);
      }
      if (t.add_ons && t.add_ons.length > 0) {
        addonIds[t.id!] = t.add_ons.map((a) => a.id!).filter(Boolean);
      }
    });
    setOriginalPackageIdsByTransfer(packageIds);
    setOriginalAddonIdsByTransfer(addonIds);
  }, []);

  return {
    editedTransfers,
    addedVehicles,
    setAddedVehicles,
    maxPvtRateColumns,
    setMaxPvtRateColumns,
    hasChanges,
    originalTransferIds,
    originalPackageIdsByTransfer,
    originalAddonIdsByTransfer,
    updateTransferField,
    updatePackageField,
    updateSeasonField,
    updateVehicleField,
    convertVehicleToDetailsString,
    addTransfer,
    duplicateTransfer,
    deleteTransfers,
    addPackage,
    deletePackages,
    addVehicle,
    deleteVehicles,
    addSeason,
    deleteSeasons,
    resetChanges,
    markAsSaved,
    refreshWithSavedData,
  };
}

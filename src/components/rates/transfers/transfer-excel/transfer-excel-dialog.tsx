"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Transfer } from "@/types/transfers";
import { ExcelHeader } from "./excel-header";
import { TabNavigation, TabId } from "./tab-navigation";
import { TransfersGrid, TransferPackagesGrid, VehicleModeGrid, VehicleTypesGrid, TransferRatesGrid } from "./grids";
import { bulkSaveTransfersExcel } from "@/data-access/transfers-excel";
import { useTransferExcelState } from "./use-transfer-excel-state";
import TransferFullscreenView from "@/components/forms/transfer-fullscreen-view";
import TransferFullscreenForm from "@/components/forms/transfer-fullscreen-form";
import { useQueryClient } from "@tanstack/react-query";
import { getSyncedColumns } from "@/data-access/common";

interface TransferExcelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transfers: Transfer[];
  onSaveSuccess?: () => void;
}

export function TransferExcelDialog({ isOpen, onClose, transfers, onSaveSuccess }: TransferExcelDialogProps) {
  const queryClient = useQueryClient();

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("transfers");
  const [viewTransferId, setViewTransferId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [syncedColumns, setSyncedColumns] = useState<string[]>([]);
  const [isLoadingSyncedColumns, setIsLoadingSyncedColumns] = useState(false);

  // Fetch synced columns when dialog opens
  useEffect(() => {
    if (isOpen) {
      const fetchSyncedColumns = async () => {
        setIsLoadingSyncedColumns(true);
        try {
          const { data, error } = await getSyncedColumns(["transfer", "transfer_package", "transfer_add_on"]);
          if (error) {
            console.error("Failed to fetch synced columns:", error);
            return;
          }
          setSyncedColumns(data || []);
        } catch (error) {
          console.error("Failed to fetch synced columns:", error);
        } finally {
          setIsLoadingSyncedColumns(false);
        }
      };
      fetchSyncedColumns();
    } else {
      // Reset synced columns when dialog closes
      setSyncedColumns([]);
      setIsLoadingSyncedColumns(false);
    }
  }, [isOpen]);

  const {
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
    refreshWithSavedData,
  } = useTransferExcelState({ transfers, isOpen });

  // Handle save - chunked to avoid payload size limits
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const CHUNK_SIZE = 30; // Transfers per chunk to stay under 4MB limit
      const allSavedTransfers: Transfer[] = [];
      const totalChunks = Math.ceil(editedTransfers.length / CHUNK_SIZE);
      for (let i = 0; i < editedTransfers.length; i += CHUNK_SIZE) {
        const chunk = editedTransfers.slice(i, i + CHUNK_SIZE);
        const isLastChunk = i + CHUNK_SIZE >= editedTransfers.length;
        // Only pass deletion info on the last chunk
        const result = await bulkSaveTransfersExcel({
          transfers: chunk,
          syncedColumns: syncedColumns,
          originalTransferIds: isLastChunk ? originalTransferIds : [],
          originalPackageIdsByTransfer: isLastChunk ? originalPackageIdsByTransfer : {},
          originalAddonIdsByTransfer: isLastChunk ? originalAddonIdsByTransfer : {},
          // Pass all current transfers/packages/addOns IDs so deletions work correctly on last chunk
          allCurrentTransferIds: isLastChunk ? editedTransfers.map((t) => t.id!) : undefined,
          allCurrentPackageIdsByTransfer: isLastChunk
            ? editedTransfers.reduce((acc, t) => {
                acc[t.id!] = t.packages?.map((p) => p.id!).filter(Boolean) || [];
                return acc;
              }, {} as Record<string, string[]>)
            : undefined,
          allCurrentAddonIdsByTransfer: isLastChunk
            ? editedTransfers.reduce((acc, t) => {
                acc[t.id!] = t.add_ons?.map((a) => a.id!).filter(Boolean) || [];
                return acc;
              }, {} as Record<string, string[]>)
            : undefined,
        });
        if (result.error) {
          const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
          toast.error(`Chunk ${chunkNumber}/${totalChunks}: ${result.error}`);
          return;
        }
        if (result.data?.savedTransfers) {
          allSavedTransfers.push(...result.data.savedTransfers);
        }
      }
      toast.success("Changes saved successfully!");
      // Refresh state with all saved data
      if (allSavedTransfers.length > 0) {
        refreshWithSavedData(allSavedTransfers);
      }
      onSaveSuccess?.();
    } catch (error) {
      toast.error("Failed to save changes");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [
    editedTransfers,
    originalTransferIds,
    originalPackageIdsByTransfer,
    originalAddonIdsByTransfer,
    refreshWithSavedData,
    onSaveSuccess,
  ]);

  // Handle close with confirmation
  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to close?")) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  // Handle view transfer
  const handleViewTransfer = useCallback((transferId: string) => {
    setViewTransferId(transferId);
  }, []);

  // Get transfer data for view modal
  const viewTransferData = useMemo(() => {
    if (!viewTransferId) return null;
    return editedTransfers.find((h) => h.id === viewTransferId) || null;
  }, [viewTransferId, editedTransfers]);

  // Calculate counts
  const packageCount = editedTransfers.reduce((acc, h) => acc + (h.packages?.length || 0), 0);

  // Render active grid
  const renderGrid = () => {
    if (editedTransfers.length === 0 || isLoadingSyncedColumns) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
          Loading transfer data...
        </div>
      );
    }

    switch (activeTab) {
      case "transfers":
        return (
          <TransfersGrid
            transfers={editedTransfers}
            syncedColumns={syncedColumns}
            onUpdateTransfer={updateTransferField}
            onAddTransfer={addTransfer}
            onDeleteTransfers={deleteTransfers}
            onViewTransfer={handleViewTransfer}
            onDuplicateTransfer={duplicateTransfer}
          />
        );
      case "transfer-packages":
        return (
          <TransferPackagesGrid
            transfers={editedTransfers}
            syncedColumns={syncedColumns}
            onUpdatePackage={updatePackageField}
            onAddPackage={addPackage}
            onDeletePackages={deletePackages}
            onViewTransfer={handleViewTransfer}
          />
        );
      case "vehicle-modes":
        return (
          <VehicleModeGrid
            transfers={editedTransfers}
            syncedColumns={syncedColumns}
            onUpdatePackage={updatePackageField}
            onViewTransfer={handleViewTransfer}
          />
        );
      case "vehicle-types":
        return (
          <VehicleTypesGrid
            transfers={editedTransfers}
            addedVehicles={addedVehicles || []}
            onUpdatePerVehicleRate={updateVehicleField}
            onAddVehicle={addVehicle}
            onDeleteVehicles={deleteVehicles}
            convertVehicleToDetailsString={convertVehicleToDetailsString}
            // onViewTransfer={handleViewTransfer}
          />
        );
      case "transfer-rates":
        return (
          <TransferRatesGrid
            transfers={editedTransfers}
            addedVehicles={addedVehicles}
            setAddedVehicles={setAddedVehicles}
            maxPvtRateColumns={maxPvtRateColumns}
            setMaxPvtRateColumns={setMaxPvtRateColumns}
            syncedColumns={syncedColumns}
            onUpdateSeason={updateSeasonField}
            onAddSeason={addSeason}
            onDeleteSeasons={deleteSeasons}
            convertVehicleToDetailsString={convertVehicleToDetailsString}
            onViewTransfer={handleViewTransfer}
          />
        );
      default:
        return null;
    }
  };

  const handleEditFromView = () => {
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    invalidateQueries();
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["getAllTransfersByUser"],
      exact: false,
      type: "active",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 gap-0 flex flex-col [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        // onEscapeKeyDown={(e) => hasChanges && e.preventDefault()}
      >
        <DialogTitle className="sr-only">Transfer Excel Editor</DialogTitle>

        {/* Header */}
        <ExcelHeader
          transferCount={editedTransfers.length}
          packageCount={packageCount}
          hasChanges={hasChanges}
          isSaving={isSaving}
          onReset={resetChanges}
          onSave={handleSave}
          onClose={handleClose}
        />

        {/* Grid Content */}
        <div className="flex-1 min-h-0 bg-background overflow-auto">{renderGrid()}</div>

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </DialogContent>

      {/* Transfer View Modal */}
      <TransferFullscreenView
        isOpen={!!viewTransferId}
        onClose={() => setViewTransferId(null)}
        transferData={viewTransferData as any}
        onEdit={handleEditFromView}
      />

      {formOpen && (
        <TransferFullscreenForm
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          initialData={viewTransferData as any}
          syncedColumns={syncedColumns}
          onSuccess={handleFormSuccess}
        />
      )}
    </Dialog>
  );
}

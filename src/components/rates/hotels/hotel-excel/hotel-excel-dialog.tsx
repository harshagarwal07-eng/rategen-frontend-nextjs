"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Hotel } from "@/types/hotels";
import { ExcelHeader } from "./excel-header";
import { TabNavigation, TabId } from "./tab-navigation";
import { HotelsGrid, AgeMealPolicyGrid, HotelRoomsGrid, RoomRatesGrid } from "./grids";
import { bulkSaveHotelsExcel } from "@/data-access/hotels-excel";
import { useHotelExcelState } from "./use-hotel-excel-state";
import HotelFullscreenView from "@/components/forms/hotel-fullscreen-view";
import HotelFullscreenForm from "@/components/forms/hotel-fullscreen-form";
import { useQueryClient } from "@tanstack/react-query";
import { getSyncedColumns } from "@/data-access/common";

interface HotelExcelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  hotels: Hotel[];
  onSaveSuccess?: () => void;
}

export function HotelExcelDialog({ isOpen, onClose, hotels, onSaveSuccess }: HotelExcelDialogProps) {
  const queryClient = useQueryClient();

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("hotels");
  const [viewHotelId, setViewHotelId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [syncedColumns, setSyncedColumns] = useState<string[]>([]);
  const [isLoadingSyncedColumns, setIsLoadingSyncedColumns] = useState(false);

  // Fetch synced columns when dialog opens
  useEffect(() => {
    if (isOpen) {
      const fetchSyncedColumns = async () => {
        setIsLoadingSyncedColumns(true);
        try {
          const { data, error } = await getSyncedColumns(["hotel", "hotel_room"]);
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
    editedHotels,
    hasChanges,
    originalHotelIds,
    originalRoomIdsByHotel,
    newHotelIds,
    newRoomIds,
    updateHotelField,
    updateRoomField,
    updateSeasonField,
    addHotel,
    duplicateHotel,
    deleteHotels,
    addRoom,
    deleteRooms,
    addSeason,
    deleteSeasons,
    resetChanges,
    refreshWithSavedData,
  } = useHotelExcelState({ hotels, isOpen });

  // Handle save - chunked to avoid payload size limits
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const CHUNK_SIZE = 30; // Hotels per chunk to stay under 4MB limit
      const allSavedHotels: Hotel[] = [];
      const totalChunks = Math.ceil(editedHotels.length / CHUNK_SIZE);

      for (let i = 0; i < editedHotels.length; i += CHUNK_SIZE) {
        const chunk = editedHotels.slice(i, i + CHUNK_SIZE);
        const isLastChunk = i + CHUNK_SIZE >= editedHotels.length;

        // Only pass deletion info on the last chunk
        const result = await bulkSaveHotelsExcel({
          hotels: chunk,
          originalHotelIds: isLastChunk ? originalHotelIds : [],
          originalRoomIdsByHotel: isLastChunk ? originalRoomIdsByHotel : {},
          newHotelIds: Array.from(newHotelIds),
          newRoomIds: Array.from(newRoomIds),
          // Pass all current hotel/room IDs so deletions work correctly on last chunk
          allCurrentHotelIds: isLastChunk ? editedHotels.map((h) => h.id) : undefined,
          allCurrentRoomIdsByHotel: isLastChunk
            ? editedHotels.reduce(
                (acc, h) => {
                  acc[h.id] = h.rooms?.map((r) => r.id!).filter(Boolean) || [];
                  return acc;
                },
                {} as Record<string, string[]>
              )
            : undefined,
        });

        if (result.error) {
          const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
          toast.error(`Chunk ${chunkNumber}/${totalChunks}: ${result.error}`);
          return;
        }

        if (result.data?.savedHotels) {
          allSavedHotels.push(...result.data.savedHotels);
        }
      }

      toast.success("Changes saved successfully!");
      // Refresh state with all saved data
      if (allSavedHotels.length > 0) {
        refreshWithSavedData(allSavedHotels);
      }
      onSaveSuccess?.();
    } catch (error) {
      toast.error("Failed to save changes");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [
    editedHotels,
    originalHotelIds,
    originalRoomIdsByHotel,
    newHotelIds,
    newRoomIds,
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

  // Handle view hotel
  const handleViewHotel = useCallback((hotelId: string) => {
    setViewHotelId(hotelId);
  }, []);

  // Get hotel data for view modal
  const viewHotelData = useMemo(() => {
    if (!viewHotelId) return null;
    return editedHotels.find((h) => h.id === viewHotelId) || null;
  }, [viewHotelId, editedHotels]);

  // Calculate counts
  const roomCount = editedHotels.reduce((acc, h) => acc + (h.rooms?.length || 0), 0);

  // Render active grid
  const renderGrid = () => {
    if (editedHotels.length === 0 || isLoadingSyncedColumns) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
          Loading hotel data...
        </div>
      );
    }

    switch (activeTab) {
      case "hotels":
        return (
          <HotelsGrid
            hotels={editedHotels}
            syncedColumns={syncedColumns}
            onUpdateHotel={updateHotelField}
            onAddHotel={addHotel}
            onDeleteHotels={deleteHotels}
            onViewHotel={handleViewHotel}
            onDuplicateHotel={duplicateHotel}
          />
        );
      case "age-meal-policy":
        return (
          <AgeMealPolicyGrid
            hotels={editedHotels}
            syncedColumns={syncedColumns}
            onUpdateHotel={updateHotelField}
            onViewHotel={handleViewHotel}
          />
        );
      case "hotel-rooms":
        return (
          <HotelRoomsGrid
            hotels={editedHotels}
            syncedColumns={syncedColumns}
            onUpdateRoom={updateRoomField}
            onAddRoom={addRoom}
            onDeleteRooms={deleteRooms}
            onViewHotel={handleViewHotel}
          />
        );
      case "room-rates":
        return (
          <RoomRatesGrid
            hotels={editedHotels}
            syncedColumns={syncedColumns}
            onUpdateSeason={updateSeasonField}
            onAddSeason={addSeason}
            onDeleteSeasons={deleteSeasons}
            onViewHotel={handleViewHotel}
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
      queryKey: ["getAllHotelsByUser"],
      exact: false,
      type: "active",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 gap-0 flex flex-col [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => hasChanges && e.preventDefault()}
      >
        <DialogTitle className="sr-only">Hotel Excel Editor</DialogTitle>

        {/* Header */}
        <ExcelHeader
          hotelCount={editedHotels.length}
          roomCount={roomCount}
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

      {/* Hotel View Modal */}
      <HotelFullscreenView
        isOpen={!!viewHotelId}
        onClose={() => setViewHotelId(null)}
        hotelData={viewHotelData as any}
        onEdit={handleEditFromView}
      />

      {formOpen && (
        <HotelFullscreenForm
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          initialData={viewHotelData as any}
          syncedColumns={syncedColumns}
          onSuccess={handleFormSuccess}
        />
      )}
    </Dialog>
  );
}

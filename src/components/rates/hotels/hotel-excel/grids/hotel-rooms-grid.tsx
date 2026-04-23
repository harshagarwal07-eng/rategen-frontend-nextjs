"use client";

import { useMemo, useCallback } from "react";
import { Hotel } from "@/types/hotels";
import { ExcelGrid, ColumnDef } from "./excel";

interface HotelRoomsGridProps {
  hotels: Hotel[];
  syncedColumns: string[];
  onUpdateRoom: (hotelId: string, roomId: string, field: string, value: any) => void;
  onAddRoom?: (hotelId: string, afterRoomId?: string, initialValues?: Record<string, any>) => void;
  onDeleteRooms?: (compositeIds: string[]) => void;
  onViewHotel?: (hotelId: string) => void;
}

type RoomRow = {
  id: string; // composite: hotelId_roomId
  hotelId: string;
  roomId: string;
  hotel_name: string;
  room_category: string;
  meal_plan: string;
  max_occupancy: string;
  extra_bed_policy: string;
  other_details: string;
  stop_sale: string;
  hotel_room_datastore_id?: string | null;
  is_unlinked?: boolean;
  _hotel_datastore_id?: string | null;
  _is_unlinked?: boolean;
};

const MEAL_PLAN_OPTIONS = ["Room Only", "Breakfast", "Half Board", "Full Board", "All Inclusive"];

const COLUMNS: ColumnDef<RoomRow>[] = [
  { id: "hotel_name", header: "Hotel Name", accessorKey: "hotel_name", width: 180, editable: false, filterable: true },
  {
    id: "room_category",
    header: "Room Category",
    accessorKey: "room_category",
    width: 180,
    editable: true,
    filterable: true,
  },
  {
    id: "meal_plan",
    header: "Meal Plan",
    accessorKey: "meal_plan",
    width: 130,
    editable: true,
    type: "select",
    options: MEAL_PLAN_OPTIONS,
    filterable: true,
  },
  { id: "max_occupancy", header: "Max Occupancy", accessorKey: "max_occupancy", width: 110, editable: true },
  {
    id: "extra_bed_policy",
    header: "Extra Bed Policy",
    accessorKey: "extra_bed_policy",
    width: 200,
    editable: true,
    type: "expandable",
  },
  {
    id: "other_details",
    header: "Other Details",
    accessorKey: "other_details",
    width: 300,
    editable: true,
    type: "expandable",
  },
  { id: "stop_sale", header: "Stop Sale", accessorKey: "stop_sale", width: 100, editable: true },
];

export function HotelRoomsGrid({
  hotels,
  syncedColumns,
  onUpdateRoom,
  onAddRoom,
  onDeleteRooms,
  onViewHotel,
}: HotelRoomsGridProps) {
  // Handle view hotel - extract hotelId from composite row id
  const handleViewRow = useCallback(
    (rowId: string) => {
      if (!onViewHotel) return;
      const hotelId = rowId.split(":::")[0];
      if (hotelId) onViewHotel(hotelId);
    },
    [onViewHotel]
  );

  // Flatten hotels -> rooms
  // Sort hotels by updated_at (latest first) to match Hotels tab
  const rows = useMemo<RoomRow[]>(() => {
    const result: RoomRow[] = [];
    const sortedHotels = [...hotels].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || "").getTime() - new Date(a.updated_at || a.created_at || "").getTime()
    );
    sortedHotels.forEach((hotel) => {
      hotel.rooms?.forEach((room) => {
        result.push({
          id: `${hotel.id}:::${room.id}`,
          hotelId: hotel.id,
          roomId: room.id!,
          hotel_name: hotel.hotel_name || "",
          room_category: room.room_category || "",
          meal_plan: room.meal_plan || "",
          max_occupancy: room.max_occupancy || "",
          extra_bed_policy: room.extra_bed_policy || "",
          other_details: room.other_details || "",
          stop_sale: room.stop_sale || "",
          hotel_room_datastore_id: room.hotel_room_datastore_id,
          is_unlinked: room.is_unlinked,
          _hotel_datastore_id: hotel.hotel_datastore_id,
          _is_unlinked: hotel.is_unlinked,
        });
      });
    });
    return result;
  }, [hotels]);

  // Handle cell change
  const handleCellChange = useCallback(
    (rowId: string, field: keyof RoomRow, value: any) => {
      const row = rows.find((r) => r.id === rowId);
      if (!row) return;

      // Ignore readonly fields
      if (field === "id" || field === "hotelId" || field === "roomId" || field === "hotel_name") return;

      onUpdateRoom(row.hotelId, row.roomId, field, value);
    },
    [rows, onUpdateRoom]
  );

  // Handle insert row - inserts after current selection, inherits hotel
  const handleInsertRow = useCallback(
    (afterRowId: string) => {
      if (!onAddRoom) return;
      // Parse composite ID: hotelId:::roomId
      const [hotelId, roomId] = afterRowId.split(":::");
      if (hotelId && roomId) {
        onAddRoom(hotelId, roomId);
      }
    },
    [onAddRoom]
  );

  // Handle delete rows
  const handleDeleteRows = useCallback(
    (rowIds: string[]) => {
      if (!onDeleteRooms) return;
      if (rowIds.length > 0) {
        onDeleteRooms(rowIds);
      }
    },
    [onDeleteRooms]
  );

  const getIsLocked = useCallback(
    (row: RoomRow, accessorKey: string, scope = "hotel_room") => {
      if (scope === "hotel") {
        const isLinked = !!row?._hotel_datastore_id && !row._is_unlinked;
        return isLinked && syncedColumns.includes(`hotel.${accessorKey}`);
      }

      const isLinked = !!row?.hotel_room_datastore_id && !row.is_unlinked;
      return isLinked && syncedColumns.includes(`hotel_room.${accessorKey}`);
    },
    [syncedColumns]
  );

  return (
    <ExcelGrid
      data={rows}
      columns={COLUMNS}
      onCellChange={handleCellChange}
      onInsertRow={onAddRoom ? handleInsertRow : undefined}
      onDeleteRows={onDeleteRooms ? handleDeleteRows : undefined}
      getIsLocked={getIsLocked}
      rowLabel="Room"
      searchFields={["hotel_name", "room_category"]}
      searchPlaceholder="Search by hotel name or room category..."
      onViewRow={onViewHotel ? handleViewRow : undefined}
    />
  );
}

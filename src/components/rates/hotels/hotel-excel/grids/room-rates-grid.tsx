"use client";

import { useMemo, useCallback } from "react";
import { Hotel } from "@/types/hotels";
import { ExcelGrid, ColumnDef } from "./excel";

interface RoomRatesGridProps {
  hotels: Hotel[];
  onUpdateSeason: (hotelId: string, roomId: string, seasonIndex: number, field: string, value: any) => void;
  onAddSeason?: (
    hotelId: string,
    roomId: string,
    afterSeasonIndex?: number,
    initialValues?: Record<string, any>
  ) => void;
  onDeleteSeasons?: (compositeIds: string[]) => void;
  onViewHotel?: (hotelId: string) => void;
  syncedColumns: string[];
}

type SeasonRow = {
  id: string; // composite: hotelId_roomId_seasonIndex
  hotelId: string;
  roomId: string;
  seasonIndex: number;
  hotel_name: string;
  room_category: string;
  meal_plan: string;
  season_name: string;
  dates: string;
  single_pp: number | null;
  double_pp: number | null;
  extra_bed_pp: number | null;
  child_no_bed: number | null;
  rate_per_night: number | null;
  hotel_room_datastore_id?: string | null;
  is_unlinked?: boolean;
  _hotel_datastore_id?: string | null;
  _is_unlinked?: boolean;
};

const COLUMNS: ColumnDef<SeasonRow>[] = [
  { id: "hotel_name", header: "Hotel Name", accessorKey: "hotel_name", width: 180, editable: false, filterable: true },
  {
    id: "room_category",
    header: "Room Category",
    accessorKey: "room_category",
    width: 160,
    editable: false,
    filterable: true,
  },
  { id: "meal_plan", header: "Meal Plan", accessorKey: "meal_plan", width: 100, editable: false, filterable: true },
  { id: "season_name", header: "Season Name", accessorKey: "season_name", width: 120, editable: true },
  { id: "dates", header: "Season Dates", accessorKey: "dates", width: 220, editable: true, type: "daterange" },
  { id: "single_pp", header: "Single PP", accessorKey: "single_pp", width: 90, editable: true, type: "number" },
  { id: "double_pp", header: "Double PP", accessorKey: "double_pp", width: 90, editable: true, type: "number" },
  { id: "extra_bed_pp", header: "Extra Bed", accessorKey: "extra_bed_pp", width: 90, editable: true, type: "number" },
  {
    id: "child_no_bed",
    header: "Child No Bed",
    accessorKey: "child_no_bed",
    width: 100,
    editable: true,
    type: "number",
  },
  {
    id: "rate_per_night",
    header: "Rate/Night",
    accessorKey: "rate_per_night",
    width: 100,
    editable: true,
    type: "number",
  },
];

export function RoomRatesGrid({
  hotels,
  syncedColumns,
  onUpdateSeason,
  onAddSeason,
  onDeleteSeasons,
  onViewHotel,
}: RoomRatesGridProps) {
  // Handle view hotel - extract hotelId from composite row id
  const handleViewRow = useCallback(
    (rowId: string) => {
      if (!onViewHotel) return;
      const hotelId = rowId.split(":::")[0];
      if (hotelId) onViewHotel(hotelId);
    },
    [onViewHotel]
  );

  // Flatten hotels -> rooms -> seasons
  // Sort hotels by updated_at (latest first) to match Hotels tab
  const rows = useMemo<SeasonRow[]>(() => {
    const result: SeasonRow[] = [];
    const sortedHotels = [...hotels].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || "").getTime() - new Date(a.updated_at || a.created_at || "").getTime()
    );
    sortedHotels.forEach((hotel) => {
      hotel.rooms?.forEach((room) => {
        room.seasons?.forEach((season, seasonIndex) => {
          result.push({
            id: `${hotel.id}:::${room.id}:::${seasonIndex}`,
            hotelId: hotel.id,
            roomId: room.id!,
            seasonIndex,
            hotel_name: hotel.hotel_name || "",
            room_category: room.room_category || "",
            meal_plan: room.meal_plan || "",
            season_name: (season as any).season_name || "",
            dates: season.dates || "",
            single_pp: season.single_pp ?? null,
            double_pp: season.double_pp ?? null,
            extra_bed_pp: season.extra_bed_pp ?? null,
            child_no_bed: season.child_no_bed ?? null,
            rate_per_night: season.rate_per_night ?? null,
            hotel_room_datastore_id: room.hotel_room_datastore_id,
            is_unlinked: room.is_unlinked,
            _hotel_datastore_id: hotel.hotel_datastore_id,
            _is_unlinked: hotel.is_unlinked,
          });
        });
      });
    });
    return result;
  }, [hotels]);

  // Handle cell change
  const handleCellChange = useCallback(
    (rowId: string, field: keyof SeasonRow, value: any) => {
      const row = rows.find((r) => r.id === rowId);
      if (!row) return;

      // Ignore readonly fields
      const editableFields = [
        "season_name",
        "dates",
        "single_pp",
        "double_pp",
        "extra_bed_pp",
        "child_no_bed",
        "rate_per_night",
      ];
      if (!editableFields.includes(field as string)) return;

      onUpdateSeason(row.hotelId, row.roomId, row.seasonIndex, field, value);
    },
    [rows, onUpdateSeason]
  );

  // Handle insert row - inserts after current selection, inherits hotel and room
  const handleInsertRow = useCallback(
    (afterRowId: string) => {
      if (!onAddSeason) return;
      // Parse composite ID: hotelId:::roomId:::seasonIndex
      const [hotelId, roomId, seasonIndexStr] = afterRowId.split(":::");
      if (hotelId && roomId) {
        const seasonIndex = seasonIndexStr !== undefined ? parseInt(seasonIndexStr, 10) : undefined;
        onAddSeason(hotelId, roomId, seasonIndex);
      }
    },
    [onAddSeason]
  );

  // Handle delete rows
  const handleDeleteRows = useCallback(
    (rowIds: string[]) => {
      if (!onDeleteSeasons) return;
      if (rowIds.length > 0) {
        onDeleteSeasons(rowIds);
      }
    },
    [onDeleteSeasons]
  );

  const getIsLocked = useCallback(
    (row: SeasonRow, accessorKey: string, scope = "hotel_room") => {
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
      onInsertRow={onAddSeason ? handleInsertRow : undefined}
      onDeleteRows={onDeleteSeasons ? handleDeleteRows : undefined}
      getIsLocked={getIsLocked}
      rowLabel="Season"
      searchFields={["hotel_name", "room_category"]}
      searchPlaceholder="Search by hotel name or room category..."
      onViewRow={onViewHotel ? handleViewRow : undefined}
    />
  );
}

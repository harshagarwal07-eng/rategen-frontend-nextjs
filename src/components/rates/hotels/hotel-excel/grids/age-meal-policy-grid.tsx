"use client";

import { useMemo, useCallback } from "react";
import { Hotel, AgePolicy } from "@/types/hotels";
import { ExcelGrid, ColumnDef } from "./excel";

const PAX_CATEGORIES = ["Adult", "Teenager", "Child", "Infant"] as const;
type PaxCategory = (typeof PAX_CATEGORIES)[number];

interface AgeMealPolicyGridProps {
  hotels: Hotel[];
  syncedColumns: string[];
  onUpdateHotel: (hotelId: string, field: string, value: any) => void;
  onBatchUpdateHotel?: (updates: Array<{ hotelId: string; field: string; value: any }>) => void;
  onViewHotel?: (hotelId: string) => void;
}

type PolicyRow = {
  id: string; // composite: hotelId_paxCategory
  hotelId: string;
  hotel_name: string;
  pax_category: PaxCategory;
  room_range: string;
  meal_range: string;
  breakfast: number | null;
  half_board: number | null;
  full_board: number | null;
  all_inclusive: number | null;
  christmas_gala: number | null;
  new_year_gala: number | null;
  _agePolicy: AgePolicy;
  _mealPlanRates: any[];
  _hotel_datastore_id?: string | null;
  _is_unlinked?: boolean;
};

const COLUMNS: ColumnDef<PolicyRow>[] = [
  { id: "hotel_name", header: "Hotel", accessorKey: "hotel_name", width: 180, editable: false, filterable: true },
  { id: "pax_category", header: "Pax Category", accessorKey: "pax_category", width: 110, editable: false, filterable: true },
  { id: "room_range", header: "Room (From-To)", accessorKey: "room_range", width: 110, editable: true },
  { id: "meal_range", header: "Meal (From-To)", accessorKey: "meal_range", width: 110, editable: true },
  { id: "breakfast", header: "Breakfast", accessorKey: "breakfast", width: 90, editable: true, type: "number" },
  { id: "half_board", header: "Half Board", accessorKey: "half_board", width: 100, editable: true, type: "number" },
  { id: "full_board", header: "Full Board", accessorKey: "full_board", width: 100, editable: true, type: "number" },
  { id: "all_inclusive", header: "All Inclusive", accessorKey: "all_inclusive", width: 100, editable: true, type: "number" },
  { id: "christmas_gala", header: "Christmas Gala", accessorKey: "christmas_gala", width: 115, editable: true, type: "number" },
  { id: "new_year_gala", header: "New Year Gala", accessorKey: "new_year_gala", width: 115, editable: true, type: "number" },
];

const mealTypeMap: Record<string, string> = {
  breakfast: "Breakfast",
  half_board: "Half Board",
  full_board: "Full Board",
  all_inclusive: "All Inclusive",
  christmas_gala: "Christmas Gala Dinner",
  new_year_gala: "New Year Gala Dinner",
};

export function AgeMealPolicyGrid({ hotels, syncedColumns, onUpdateHotel, onBatchUpdateHotel, onViewHotel }: AgeMealPolicyGridProps) {
  // Handle view hotel - extract hotelId from composite row id
  const handleViewRow = useCallback((rowId: string) => {
    if (!onViewHotel) return;
    const hotelId = rowId.split(":::")[0];
    if (hotelId) onViewHotel(hotelId);
  }, [onViewHotel]);

  // Flatten hotels -> always show all 4 pax categories for each hotel
  // Sort hotels by updated_at (latest first) to match Hotels tab
  const rows = useMemo<PolicyRow[]>(() => {
    const result: PolicyRow[] = [];
    const sortedHotels = [...hotels].sort((a, b) =>
      new Date(b.updated_at || b.created_at || "").getTime() - new Date(a.updated_at || a.created_at || "").getTime()
    );
    sortedHotels.forEach((hotel) => {
      const agePolicy = hotel.age_policy || {};
      const mealRates = hotel.meal_plan_rates || [];

      // Always show all 4 categories for each hotel
      PAX_CATEGORIES.forEach((paxCategory) => {
        const paxKey = paxCategory.toLowerCase();
        const paxPolicy = agePolicy[paxKey as keyof AgePolicy] || { rooms: { from: null, to: null }, meals: { from: null, to: null } };

        const getMealRate = (mealType: string): number | null => {
          const rate = mealRates.find((m) => m.meal_type === mealType);
          if (!rate?.rates) return null;
          return (rate.rates as any)[paxKey] ?? null;
        };

        // Format range - show empty if both null, partial if one null
        const formatRange = (from: number | null | undefined, to: number | null | undefined): string => {
          if (from == null && to == null) return "";
          return `${from ?? ""}-${to ?? ""}`;
        };

        result.push({
          id: `${hotel.id}:::${paxKey}`,
          hotelId: hotel.id,
          hotel_name: hotel.hotel_name || "",
          pax_category: paxCategory,
          room_range: formatRange(paxPolicy.rooms?.from, paxPolicy.rooms?.to),
          meal_range: formatRange(paxPolicy.meals?.from, paxPolicy.meals?.to),
          breakfast: getMealRate("Breakfast"),
          half_board: getMealRate("Half Board"),
          full_board: getMealRate("Full Board"),
          all_inclusive: getMealRate("All Inclusive"),
          christmas_gala: getMealRate("Christmas Gala Dinner"),
          new_year_gala: getMealRate("New Year Gala Dinner"),
          _hotel_datastore_id: hotel.hotel_datastore_id,
          _is_unlinked: hotel.is_unlinked,
          _agePolicy: agePolicy,
          _mealPlanRates: mealRates,
        });
      });
    });
    return result;
  }, [hotels]);

  // Handle cell change
  const handleCellChange = useCallback(
    (rowId: string, field: keyof PolicyRow, value: any) => {
      const row = rows.find((r) => r.id === rowId);
      if (!row) return;

      // Extract the pax key from the row ID (format: hotelId:::paxKey)
      const paxKey = rowId.split(":::")[1] || "";

      // Skip internal/readonly fields
      if (
        field === "id" ||
        field === "hotelId" ||
        field === "hotel_name" ||
        field === "pax_category" ||
        field === "_agePolicy" ||
        field === "_mealPlanRates"
      ) {
        return;
      }

      // Handle age policy changes (room_range, meal_range)
      if (field === "room_range" || field === "meal_range") {
        const newPolicy = JSON.parse(JSON.stringify(row._agePolicy || {}));

        // If value is empty/null, clear the range
        const strValue = String(value ?? "");
        const parts = strValue.split("-");
        const from = parts[0] !== "" ? parseInt(parts[0], 10) : null;
        const to = parts[1] !== undefined && parts[1] !== "" ? parseInt(parts[1], 10) : null;

        // Ensure the pax category object and its nested objects exist
        if (!newPolicy[paxKey]) {
          newPolicy[paxKey] = {};
        }
        if (!newPolicy[paxKey].rooms) {
          newPolicy[paxKey].rooms = { from: null, to: null };
        }
        if (!newPolicy[paxKey].meals) {
          newPolicy[paxKey].meals = { from: null, to: null };
        }

        if (field === "room_range") {
          newPolicy[paxKey].rooms.from = from;
          newPolicy[paxKey].rooms.to = to;
        } else {
          newPolicy[paxKey].meals.from = from;
          newPolicy[paxKey].meals.to = to;
        }

        onUpdateHotel(row.hotelId, "age_policy", newPolicy);
        return;
      }

      // Handle meal rate changes
      const mealType = mealTypeMap[field];
      if (!mealType) return;

      const newRates = JSON.parse(JSON.stringify(row._mealPlanRates || []));
      let rateIdx = newRates.findIndex((m: any) => m.meal_type === mealType);
      if (rateIdx === -1) {
        newRates.push({ meal_type: mealType, rates: { adult: null, teenager: null, child: null, infant: null } });
        rateIdx = newRates.length - 1;
      }
      if (!newRates[rateIdx].rates) {
        newRates[rateIdx].rates = { adult: null, teenager: null, child: null, infant: null };
      }

      // Use actual pax key from row ID
      newRates[rateIdx].rates[paxKey] = value;
      onUpdateHotel(row.hotelId, "meal_plan_rates", newRates);
    },
    [rows, onUpdateHotel]
  );

  // Batch cell change handler - processes all changes at once
  const handleBatchCellChange = useCallback(
    (changes: Array<{ rowId: string; field: keyof PolicyRow; value: any }>) => {
      // Group changes by hotel
      const changesByHotel = new Map<string, Array<{ row: PolicyRow; rowId: string; field: keyof PolicyRow; value: any }>>();

      changes.forEach(({ rowId, field, value }) => {
        const row = rows.find((r) => r.id === rowId);
        if (!row) return;

        // Skip readonly fields
        if (field === "id" || field === "hotelId" || field === "hotel_name" ||
            field === "pax_category" || field === "_agePolicy" || field === "_mealPlanRates") {
          return;
        }

        if (!changesByHotel.has(row.hotelId)) {
          changesByHotel.set(row.hotelId, []);
        }
        changesByHotel.get(row.hotelId)!.push({ row, rowId, field, value });
      });

      // Process each hotel's changes
      changesByHotel.forEach((hotelChanges, hotelId) => {
        const hotel = hotels.find(h => h.id === hotelId);
        if (!hotel) return;

        // Start with current hotel data
        let newAgePolicy = JSON.parse(JSON.stringify(hotel.age_policy || {}));
        let newMealRates = JSON.parse(JSON.stringify(hotel.meal_plan_rates || []));
        let agePolicyChanged = false;
        let mealRatesChanged = false;

        hotelChanges.forEach(({ row, rowId, field, value }) => {
          // Extract the actual pax key from the row ID
          const paxKey = rowId.split(":::")[1] || "";

          // Handle age policy changes
          if (field === "room_range" || field === "meal_range") {
            const strValue = String(value ?? "");
            const parts = strValue.split("-");
            const from = parts[0] !== "" ? parseInt(parts[0], 10) : null;
            const to = parts[1] !== undefined && parts[1] !== "" ? parseInt(parts[1], 10) : null;

            if (!newAgePolicy[paxKey]) newAgePolicy[paxKey] = {};
            if (!newAgePolicy[paxKey].rooms) newAgePolicy[paxKey].rooms = { from: null, to: null };
            if (!newAgePolicy[paxKey].meals) newAgePolicy[paxKey].meals = { from: null, to: null };

            if (field === "room_range") {
              newAgePolicy[paxKey].rooms.from = from;
              newAgePolicy[paxKey].rooms.to = to;
            } else {
              newAgePolicy[paxKey].meals.from = from;
              newAgePolicy[paxKey].meals.to = to;
            }
            agePolicyChanged = true;
          } else {
            // Handle meal rate changes
            const mealType = mealTypeMap[field as string];
            if (!mealType) return;

            let rateIdx = newMealRates.findIndex((m: any) => m.meal_type === mealType);
            if (rateIdx === -1) {
              newMealRates.push({ meal_type: mealType, rates: { adult: null, teenager: null, child: null, infant: null } });
              rateIdx = newMealRates.length - 1;
            }
            if (!newMealRates[rateIdx].rates) {
              newMealRates[rateIdx].rates = { adult: null, teenager: null, child: null, infant: null };
            }

            // Use paxKey from row ID
            newMealRates[rateIdx].rates[paxKey] = value;
            mealRatesChanged = true;
          }
        });

        // Apply changes
        if (agePolicyChanged) {
          onUpdateHotel(hotelId, "age_policy", newAgePolicy);
        }
        if (mealRatesChanged) {
          onUpdateHotel(hotelId, "meal_plan_rates", newMealRates);
        }
      });
    },
    [rows, hotels, onUpdateHotel]
  );

  const getIsLocked = useCallback(
    (row: PolicyRow, accessorKey: string) => {
      const isLinked = !!row?._hotel_datastore_id && !row._is_unlinked;

      return isLinked && syncedColumns.includes(`hotel.${accessorKey}`);
    },
    [syncedColumns]
  );

  return (
    <ExcelGrid
      data={rows}
      columns={COLUMNS}
      onCellChange={handleCellChange}
      onBatchCellChange={handleBatchCellChange}
      getIsLocked={getIsLocked}
      rowLabel="Policy"
      searchFields={["hotel_name"]}
      searchPlaceholder="Search by hotel name..."
      onViewRow={onViewHotel ? handleViewRow : undefined}
    />
  );
}

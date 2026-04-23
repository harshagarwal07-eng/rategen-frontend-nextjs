"use client";

import { useMemo, useCallback } from "react";
import { Transfer, ValidVehicle, VehicleType } from "@/types/transfers";
import { ExcelGrid, ColumnDef } from "./excel";

interface VehicleTypesGridProps {
  transfers: Transfer[];
  addedVehicles: VehicleType[];
  onUpdatePerVehicleRate: (sourceIds: string[], is_new: boolean, field: string, value: any) => void;
  onAddVehicle?: (afterVehicleId?: string, initialValues?: Record<string, any>) => void;
  onDeleteVehicles?: (ids: string[]) => void;
  convertVehicleToDetailsString: (vehicle: ValidVehicle) => string;
  // onViewTransfer?: (transferId: string) => void;
}

type VehicleTypeRow = {
  id: string; // vehicle type details string like vehicle_type:::brand:::max_passengers:::max_luggage or temporaryId
  vehicle_type?: string;
  brand: string;
  max_passengers: number | null;
  max_luggage: number | null;
  is_new: boolean;
  sourceIds?: string[]; // composite: transferId:::packageId:::seasonIndex:::vehicleIndex
};

const COLUMNS: ColumnDef<VehicleTypeRow>[] = [
  { id: "vehicle_type", header: "Vehicle type", accessorKey: "vehicle_type", width: 120, editable: true },
  { id: "brand", header: "Brand", accessorKey: "brand", width: 120, editable: true },
  { id: "max_passengers", header: "Max pax", accessorKey: "max_passengers", width: 90, editable: true, type: "number" },
  { id: "max_luggage", header: "Max luggage", accessorKey: "max_luggage", width: 100, editable: true, type: "number" },
];

export function VehicleTypesGrid({
  transfers,
  addedVehicles = [],
  onUpdatePerVehicleRate,
  onAddVehicle,
  onDeleteVehicles,
  convertVehicleToDetailsString,
}: // onViewTransfer,
VehicleTypesGridProps) {
  // const handleViewRow = useCallback(
  //   (rowId: string) => {
  //     if (!onViewTransfer) return;
  //     const transferId = rowId.split(":::")[0];
  //     if (transferId) onViewTransfer(transferId);
  //   },
  //   [onViewTransfer]
  // );

  const duplicateVehicleError = useMemo(() => {
    if (addedVehicles.length < 2) return undefined;
    const detailsCount = new Map<string, number>();
    for (const vehicle of addedVehicles) {
      const key = convertVehicleToDetailsString(vehicle as ValidVehicle);
      detailsCount.set(key, (detailsCount.get(key) ?? 0) + 1);
    }
    const hasDuplicate = [...detailsCount.values()].some((c) => c > 1);
    return hasDuplicate ? "Duplicate vehicle type in list. Remove or edit duplicates." : undefined;
  }, [addedVehicles, convertVehicleToDetailsString]);

  const rows = useMemo<VehicleTypeRow[]>(() => {
    const result: VehicleTypeRow[] = [];
    const sortedTransfers = [...transfers].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || "").getTime() - new Date(a.updated_at || a.created_at || "").getTime()
    );
    const vehicleTypeDetailsStrings = new Set<string>();
    sortedTransfers.forEach((transfer) => {
      transfer.packages?.forEach((pkg) => {
        const seasons = pkg.seasons || [];
        seasons.forEach((season, seasonIndex) => {
          const perVehicleRate = season.per_vehicle_rate || [];
          perVehicleRate.forEach((vehicle, vehicleIndex) => {
            const vehicleTypeDetailsString = convertVehicleToDetailsString(vehicle as ValidVehicle);
            if (!vehicleTypeDetailsStrings.has(vehicleTypeDetailsString)) {
              vehicleTypeDetailsStrings.add(vehicleTypeDetailsString);
            }

            const existingRow = result.find((r) => r.id === vehicleTypeDetailsString);
            if (existingRow) {
              existingRow.sourceIds?.push(`${transfer.id}:::${pkg.id}:::${seasonIndex}:::${vehicleIndex}`);
            } else {
              result.push({
                id: vehicleTypeDetailsString,
                vehicle_type: vehicle.vehicle_type ?? "",
                brand: vehicle.brand ?? "",
                max_passengers: vehicle.max_passengers ?? null,
                max_luggage: vehicle.max_luggage ?? null,
                is_new: false,
                sourceIds: [`${transfer.id}:::${pkg.id}:::${seasonIndex}:::${vehicleIndex}`],
              });
            }
          });
        });
      });
    });
    addedVehicles.forEach((vehicle) => {
      result.push({
        id: vehicle.id,
        vehicle_type: vehicle.vehicle_type ?? "",
        brand: vehicle.brand ?? "",
        max_passengers: vehicle.max_passengers ?? null,
        max_luggage: vehicle.max_luggage ?? null,
        is_new: true,
      });
    });
    return result;
  }, [transfers, addedVehicles]);

  const handleCellChange = useCallback(
    (rowId: string, field: keyof VehicleTypeRow, value: any) => {
      const row = rows.find((r) => r.id === rowId);
      if (!row) return;

      const editableFields = ["vehicle_type", "brand", "max_passengers", "max_luggage"];
      if (!editableFields.includes(field as string)) return;

      const sourceIds = row.is_new ? [row.id] : row.sourceIds ?? [];
      if (sourceIds.length > 0) {
        onUpdatePerVehicleRate(sourceIds, row.is_new, field, value);
      }
    },
    [rows, onUpdatePerVehicleRate]
  );

  // Handle insert row - inserts after current selection, inherits hotel and room
  const handleInsertRow = useCallback(
    (afterRowId: string) => {
      if (!onAddVehicle) return;
      if (afterRowId) {
        onAddVehicle(afterRowId);
      }
    },
    [onAddVehicle]
  );

  // Handle delete rows
  const handleDeleteRows = useCallback(
    (rowIds: string[]) => {
      if (!onDeleteVehicles) return;
      if (rowIds.length > 0) {
        onDeleteVehicles(rowIds);
      }
    },
    [onDeleteVehicles]
  );

  return (
    <ExcelGrid
      data={rows}
      columns={COLUMNS}
      onCellChange={handleCellChange}
      onInsertRow={onAddVehicle ? handleInsertRow : undefined}
      onDeleteRows={onDeleteVehicles ? handleDeleteRows : undefined}
      rowLabel="Vehicle type"
      searchFields={["vehicle_type", "brand"]}
      searchPlaceholder="Search by vehicle type or brand..."
      gridError={duplicateVehicleError}
    />
  );
}

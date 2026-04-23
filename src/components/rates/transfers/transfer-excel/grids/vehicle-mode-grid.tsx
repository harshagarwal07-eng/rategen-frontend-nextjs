"use client";

import { useMemo, useCallback } from "react";
import { Transfer } from "@/types/transfers";
import { ExcelGrid, ColumnDef } from "./excel";

interface VehicleModeGridProps {
  transfers: Transfer[];
  onUpdatePackage: (transferId: string, packageId: string, field: string, value: any) => void;
  onViewTransfer?: (transferId: string) => void;
  syncedColumns: string[];
}

type SeasonRow = {
  id: string; // composite: transferId_packageId_seasonIndex
  transferId: string;
  packageId: string;
  transfer_name: string;
  name: string; // package name
  origin: string;
  destination: string;
  meeting_point: string;
  pickup_point: string;
  dropoff_point: string;
  transfer_package_datastore_id?: string | null;
  is_unlinked?: boolean;
  _transfer_datastore_id?: string | null;
  _is_unlinked?: boolean;
};

const COLUMNS: ColumnDef<SeasonRow>[] = [
  {
    id: "transfer_name",
    header: "Transfer Name",
    accessorKey: "transfer_name",
    width: 250,
    editable: false,
    filterable: true,
  },
  {
    id: "name",
    header: "Package Name",
    accessorKey: "name",
    width: 250,
    editable: false,
    filterable: true,
  },
  { id: "origin", header: "Origin", accessorKey: "origin", width: 200, editable: true, type: "expandable" },
  {
    id: "destination",
    header: "Destination",
    accessorKey: "destination",
    width: 200,
    editable: true,
    type: "expandable",
  },
  {
    id: "meeting_point",
    header: "Meeting Point",
    accessorKey: "meeting_point",
    width: 200,
    editable: true,
    type: "expandable",
  },
  {
    id: "pickup_point",
    header: "Pickup Point",
    accessorKey: "pickup_point",
    width: 200,
    editable: true,
    type: "expandable",
  },
  {
    id: "dropoff_point",
    header: "Dropoff Point",
    accessorKey: "dropoff_point",
    width: 200,
    editable: true,
    type: "expandable",
  },
];

export function VehicleModeGrid({ transfers, syncedColumns, onUpdatePackage, onViewTransfer }: VehicleModeGridProps) {
  // Handle view transfer - extract transferId from composite row id
  const handleViewRow = useCallback(
    (rowId: string) => {
      if (!onViewTransfer) return;
      const transferId = rowId.split(":::")[0];
      if (transferId) onViewTransfer(transferId);
    },
    [onViewTransfer]
  );

  // Flatten transfers -> rooms -> seasons
  // Sort transfers by updated_at (latest first) to match transfers tab
  const rows = useMemo<SeasonRow[]>(() => {
    const result: SeasonRow[] = [];
    const sortedtransfers = [...transfers].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || "").getTime() - new Date(a.updated_at || a.created_at || "").getTime()
    );
    sortedtransfers.forEach((transfer) => {
      transfer.packages?.forEach((pkg) => {
        result.push({
          id: `${transfer.id}:::${pkg.id}`,
          transferId: transfer.id!,
          packageId: pkg.id!,
          transfer_name: transfer.transfer_name || "",
          name: pkg.name || "",
          origin: pkg.origin || "",
          destination: pkg.destination || "",
          meeting_point: pkg.meeting_point || "",
          pickup_point: pkg.pickup_point || "",
          dropoff_point: pkg.dropoff_point || "",
          transfer_package_datastore_id: pkg.transfer_package_datastore_id,
          is_unlinked: pkg.is_unlinked,
          _transfer_datastore_id: transfer.transfer_datastore_id,
          _is_unlinked: transfer.is_unlinked,
        });
      });
    });
    return result;
  }, [transfers]);

  // Handle cell change
  const handleCellChange = useCallback(
    (rowId: string, field: keyof SeasonRow, value: any) => {
      const row = rows.find((r) => r.id === rowId);
      if (!row) return;

      // Ignore readonly fields
      const editableFields = ["origin", "destination", "meeting_point", "pickup_point", "dropoff_point"];
      if (!editableFields.includes(field as string)) return;

      onUpdatePackage(row.transferId, row.packageId, field, value);
    },
    [rows, onUpdatePackage]
  );

  const getIsLocked = useCallback(
    (row: SeasonRow, accessorKey: string) => {
      const isLinked =
        (!!row?._transfer_datastore_id && !row._is_unlinked) ||
        (!!row?.transfer_package_datastore_id && !row.is_unlinked);
      return (
        isLinked &&
        (syncedColumns.includes(`transfer.${accessorKey}`) || syncedColumns.includes(`transfer_package.${accessorKey}`))
      );
    },
    [syncedColumns]
  );

  return (
    <ExcelGrid
      data={rows}
      columns={COLUMNS}
      onCellChange={handleCellChange}
      getIsLocked={getIsLocked}
      rowLabel="Vehicle Mode"
      searchFields={["transfer_name", "name"]}
      searchPlaceholder="Search by transfer name or package name..."
      onViewRow={onViewTransfer ? handleViewRow : undefined}
    />
  );
}

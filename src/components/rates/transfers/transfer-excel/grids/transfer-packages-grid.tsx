"use client";

import { useMemo, useCallback } from "react";
import { Transfer, TRANSFER_TYPE_GROUPS } from "@/types/transfers";
import { ExcelGrid, ColumnDef } from "./excel";
import { IOption } from "@/types/common";

interface TransferPackagesGridProps {
  transfers: Transfer[];
  syncedColumns: string[];
  onUpdatePackage: (transferId: string, packageId: string, field: string, value: any) => void;
  onAddPackage?: (transferId: string, afterPackageId?: string, initialValues?: Record<string, any>) => void;
  onDeletePackages?: (compositeIds: string[]) => void;
  onViewTransfer?: (transferId: string) => void;
}

type PackageRow = {
  id: string; // composite: transferId_packageId
  transferId: string;
  packageId: string;
  transfer_name: string;
  name: string;
  transfer_type: any[];
  description: string;
  notes: string;
  remarks: string;
  duration: { days?: number; hours?: number; minutes?: number } | null;
  num_stops: number;
  inclusions: string;
  exclusions: string;
  transfer_package_datastore_id?: string | null;
  is_unlinked?: boolean;
  _transfer_datastore_id?: string | null;
  _is_unlinked?: boolean;
};

const COLUMNS: ColumnDef<PackageRow>[] = [
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
    editable: true,
    filterable: true,
  },
  {
    id: "transfer_type",
    header: "Transfer Type",
    accessorKey: "transfer_type",
    width: 150,
    editable: true,
    type: "multi-select",
    options: TRANSFER_TYPE_GROUPS as unknown as { group: string; options: IOption[] }[],
    filterable: true,
  },
  { id: "num_stops", header: "Stops", accessorKey: "num_stops", width: 80, editable: true, type: "number" },
  {
    id: "duration",
    header: "Duration",
    accessorKey: "duration",
    type: "duration",
    editable: true,
    width: 100,
  },
  {
    id: "description",
    header: "Description",
    accessorKey: "description",
    width: 200,
    editable: true,
    type: "expandable",
  },
  { id: "notes", header: "Notes", accessorKey: "notes", width: 200, editable: true, type: "expandable" },
  { id: "remarks", header: "Remarks", accessorKey: "remarks", width: 200, editable: true, type: "expandable" },
  { id: "inclusions", header: "Inclusions", accessorKey: "inclusions", width: 200, editable: true, type: "expandable" },
  { id: "exclusions", header: "Exclusions", accessorKey: "exclusions", width: 200, editable: true, type: "expandable" },
];

export function TransferPackagesGrid({
  transfers,
  syncedColumns,
  onUpdatePackage,
  onAddPackage,
  onDeletePackages,
  onViewTransfer,
}: TransferPackagesGridProps) {
  // Handle view transfer - extract transferId from composite row id
  const handleViewRow = useCallback(
    (rowId: string) => {
      if (!onViewTransfer) return;
      const transferId = rowId.split(":::")[0];
      if (transferId) onViewTransfer(transferId);
    },
    [onViewTransfer]
  );

  // Flatten transfers -> packages
  // Sort transfers by updated_at (latest first) to match Transfers tab
  const rows = useMemo<PackageRow[]>(() => {
    const result: PackageRow[] = [];
    const sortedTransfers = [...transfers].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || "").getTime() - new Date(a.updated_at || a.created_at || "").getTime()
    );
    sortedTransfers.forEach((transfer) => {
      transfer.packages?.forEach((pkg) => {
        result.push({
          id: `${transfer.id}:::${pkg.id}`,
          transferId: transfer.id!,
          packageId: pkg.id!,
          transfer_name: transfer.transfer_name || "",
          name: pkg.name || "",
          transfer_type: pkg.transfer_type || [],
          description: pkg.description || "",
          notes: pkg.notes || "",
          remarks: pkg.remarks || "",
          duration: pkg.duration || null,
          num_stops: pkg.num_stops || 0,
          inclusions: pkg.inclusions || "",
          exclusions: pkg.exclusions || "",
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
    (rowId: string, field: keyof PackageRow, value: any) => {
      const row = rows.find((r) => r.id === rowId);
      if (!row) return;

      // Ignore readonly fields
      if (
        field === "id" ||
        field === "transferId" ||
        field === "packageId" ||
        field === "transfer_name" ||
        field === "name"
      )
        return;

      onUpdatePackage(row.transferId, row.packageId, field, value);
    },
    [rows, onUpdatePackage]
  );

  // Handle insert row - inserts after current selection, inherits transfer
  const handleInsertRow = useCallback(
    (afterRowId: string) => {
      if (!onAddPackage) return;
      // Parse composite ID: transferId:::packageId
      const [transferId, packageId] = afterRowId.split(":::");
      if (transferId && packageId) {
        onAddPackage(transferId, packageId);
      }
    },
    [onAddPackage]
  );

  // Handle delete rows
  const handleDeleteRows = useCallback(
    (rowIds: string[]) => {
      if (!onDeletePackages) return;
      if (rowIds.length > 0) {
        onDeletePackages(rowIds);
      }
    },
    [onDeletePackages]
  );

  const getIsLocked = useCallback(
    (row: PackageRow, accessorKey: string, scope = "transfer_package") => {
      if (scope === "transfer") {
        const isLinked = !!row?._transfer_datastore_id && !row._is_unlinked;
        return isLinked && syncedColumns.includes(`transfer.${accessorKey}`);
      }

      const isLinked = !!row?.transfer_package_datastore_id && !row.is_unlinked;
      return isLinked && syncedColumns.includes(`transfer_package.${accessorKey}`);
    },
    [syncedColumns]
  );

  return (
    <ExcelGrid
      data={rows}
      columns={COLUMNS}
      onCellChange={handleCellChange}
      onInsertRow={onAddPackage ? handleInsertRow : undefined}
      onDeleteRows={onDeletePackages ? handleDeleteRows : undefined}
      getIsLocked={getIsLocked}
      rowLabel="Package"
      searchFields={["transfer_name", "name"]}
      searchPlaceholder="Search by transfer name or package name..."
      onViewRow={onViewTransfer ? handleViewRow : undefined}
    />
  );
}

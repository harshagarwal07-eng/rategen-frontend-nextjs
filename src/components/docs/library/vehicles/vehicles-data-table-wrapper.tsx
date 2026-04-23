"use client";

import { useState, useMemo } from "react";
import { VehiclesDataTable } from "./vehicles-data-table";
import { LibraryToolbar } from "../library-toolbar";
import { BulkDeleteToolbar } from "./bulk-delete-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { IVehicle } from "@/types/docs";
import VehicleFullscreenForm from "@/components/forms/library-forms/vehicle-form";

interface Props {
  data: { data: IVehicle[]; totalItems: number };
  columnsFactory: (
    onEdit: (vehicle: IVehicle) => void,
    onDelete: (id: string) => void
  ) => ColumnDef<IVehicle, any>[];
  showAddButton?: boolean;
  loading?: boolean;
}

export function VehiclesDataTableWrapper({
  data,
  columnsFactory,
  showAddButton = true,
  loading = false,
}: Props) {
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<IVehicle | null>(null);
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(25));

  const pageCount = Math.ceil(data.totalItems / pageSize);

  const handleEdit = (vehicle: IVehicle) => {
    setEditingVehicle(vehicle);
  };

  const handleDelete = (id: string) => {
    // Optional: handle any cleanup after delete
  };

  const columns = useMemo(
    () => columnsFactory(handleEdit, handleDelete),
    [columnsFactory]
  );

  // Find the first data column (skip actions column)
  const firstDataColumn = columns.find((col) => col.id && col.id !== "actions" && col.enablePinning);

  // Find the actions column
  const actionsColumn = columns.find((col) => col.id === "actions");

  const { table } = useDataTable({
    data: data.data,
    columns,
    pageCount,
    shallow: false,
    debounceMs: 500,
    initialState: {
      columnPinning: {
        left: firstDataColumn?.id ? [firstDataColumn.id] : [],
        right: actionsColumn?.id ? [actionsColumn.id] : [],
      },
      columnVisibility: {
        created_at: false,
      },
    },
  });

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
  const hasSelection = selectedRows.length > 0;

  const handleClearSelection = () => {
    table.resetRowSelection();
  };

  return (
    <>
      <VehiclesDataTable table={table} loading={loading}>
        {hasSelection ? (
          <div className={loading ? "pointer-events-none opacity-60" : ""}>
            <BulkDeleteToolbar selectedRows={selectedRows} onClearSelection={handleClearSelection} />
          </div>
        ) : (
          <div className={loading ? "pointer-events-none opacity-60" : ""}>
            <LibraryToolbar
              table={table}
              showAddButton={showAddButton}
              onAddClick={() => setIsAddingVehicle(true)}
              addButtonLabel="Add Vehicle"
              title="Vehicles Library"
            />
          </div>
        )}
      </VehiclesDataTable>

      <VehicleFullscreenForm
        isOpen={isAddingVehicle}
        onClose={() => setIsAddingVehicle(false)}
        onSuccess={() => setIsAddingVehicle(false)}
      />

      <VehicleFullscreenForm
        isOpen={!!editingVehicle}
        onClose={() => setEditingVehicle(null)}
        onSuccess={() => setEditingVehicle(null)}
        initialData={editingVehicle || undefined}
      />
    </>
  );
}

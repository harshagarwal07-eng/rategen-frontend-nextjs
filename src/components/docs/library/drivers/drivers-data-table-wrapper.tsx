"use client";

import { useState, useMemo } from "react";
import { DriversDataTable } from "./drivers-data-table";
import { LibraryToolbar } from "../library-toolbar";
import { BulkDeleteToolbar } from "./bulk-delete-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { IDriver } from "@/types/docs";
import DriverFullscreenForm from "@/components/forms/library-forms/driver-form";

interface Props {
  data: { data: IDriver[]; totalItems: number };
  columnsFactory: (
    onEdit: (driver: IDriver) => void,
    onDelete: (id: string) => void
  ) => ColumnDef<IDriver, any>[];
  showAddButton?: boolean;
  loading?: boolean;
}

export function DriversDataTableWrapper({
  data,
  columnsFactory,
  showAddButton = true,
  loading = false,
}: Props) {
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [editingDriver, setEditingDriver] = useState<IDriver | null>(null);
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(25));

  const pageCount = Math.ceil(data.totalItems / pageSize);

  const handleEdit = (driver: IDriver) => {
    setEditingDriver(driver);
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
      <DriversDataTable table={table} loading={loading}>
        {hasSelection ? (
          <div className={loading ? "pointer-events-none opacity-60" : ""}>
            <BulkDeleteToolbar selectedRows={selectedRows} onClearSelection={handleClearSelection} />
          </div>
        ) : (
          <div className={loading ? "pointer-events-none opacity-60" : ""}>
            <LibraryToolbar
              table={table}
              showAddButton={showAddButton}
              onAddClick={() => setIsAddingDriver(true)}
              addButtonLabel="Add Driver"
              title="Drivers Library"
            />
          </div>
        )}
      </DriversDataTable>

      <DriverFullscreenForm
        isOpen={isAddingDriver}
        onClose={() => setIsAddingDriver(false)}
        onSuccess={() => setIsAddingDriver(false)}
      />

      <DriverFullscreenForm
        isOpen={!!editingDriver}
        onClose={() => setEditingDriver(null)}
        onSuccess={() => setEditingDriver(null)}
        initialData={editingDriver || undefined}
      />
    </>
  );
}

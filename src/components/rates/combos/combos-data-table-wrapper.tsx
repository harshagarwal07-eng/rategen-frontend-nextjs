"use client";

import { CombosDataTable } from "./combos-data-table";
import { DataTableToolbar } from "@/components/ui/table/data-table-toolbar";
import { BulkDeleteToolbar } from "./bulk-delete-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { ICombo } from "@/components/forms/schemas/combos-datastore-schema";

interface Props {
  data: { data: ICombo[]; totalItems: number };
  columns: ColumnDef<ICombo, any>[];
  showImportButton?: boolean;
  showAddButton?: boolean;
}

export function CombosDataTableWrapper({
  data,
  columns,
  showImportButton = false,
  showAddButton = false,
}: Props) {
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(100));

  const pageCount = Math.ceil(data.totalItems / pageSize);

  // Use the provided columns
  const activeColumns = columns;

  // Find the first data column (skip actions column)
  const firstDataColumn = activeColumns.find(
    (col) => col.id && col.id !== "actions" && col.enablePinning
  );

  // Find the actions column
  const actionsColumn = activeColumns.find((col) => col.id === "actions");

  const { table } = useDataTable({
    data: data.data,
    columns: activeColumns,
    pageCount,
    shallow: false,
    debounceMs: 500,
    initialState: {
      columnPinning: {
        left: firstDataColumn?.id ? [firstDataColumn.id] : [],
        right: actionsColumn?.id ? [actionsColumn.id] : [],
      },
      columnVisibility: {
        remarks: false,
      },
    },
  });

  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((row) => row.original);
  const hasSelection = selectedRows.length > 0;

  const handleClearSelection = () => {
    table.resetRowSelection();
  };

  return (
    <CombosDataTable table={table}>
      <div className="flex items-center justify-between">
        {hasSelection ? (
          <BulkDeleteToolbar
            selectedRows={selectedRows}
            onClearSelection={handleClearSelection}
          />
        ) : (
          <DataTableToolbar
            table={table}
            showImportButton={showImportButton}
            showAddButton={showAddButton}
          />
        )}
      </div>
    </CombosDataTable>
  );
}

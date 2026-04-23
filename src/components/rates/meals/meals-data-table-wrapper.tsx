"use client";

import { MealsDataTable } from "./meals-data-table";
import { DataTableToolbar } from "@/components/ui/table/data-table-toolbar";
import { BulkDeleteToolbar } from "./bulk-delete-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { Meal } from "@/types/meals";

interface Props {
  data: { data: Meal[]; totalItems: number };
  columns: ColumnDef<Meal, any>[];
  showImportButton?: boolean;
  showAddButton?: boolean;
}

export function MealsDataTableWrapper({
  data,
  columns,
  showImportButton = false,
  showAddButton = false,
}: Props) {
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(25));

  const pageCount = Math.ceil(data.totalItems / pageSize);

  // Find the first data column (skip actions column)
  const firstDataColumn = columns.find(
    (col) => col.id && col.id !== "actions" && col.enablePinning
  );

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
        cancellation: false,
        remarks: false,
        examples: false,
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
    <MealsDataTable table={table}>
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
    </MealsDataTable>
  );
}

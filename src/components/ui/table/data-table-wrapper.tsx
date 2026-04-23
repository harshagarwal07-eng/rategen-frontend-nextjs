"use client";

import { DataTable } from "@/components/ui/table/data-table";
import { DataTableToolbar } from "@/components/ui/table/data-table-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, useQueryState } from "nuqs";

interface Props<TData, TValue> {
  data: { data: TData[]; totalItems: number };
  columns: ColumnDef<TData, TValue>[];
  showImportButton?: boolean;
  showAddButton?: boolean;
}

export function DataTableWrapper<TData, TValue>({
  data,
  columns,
  showImportButton = false,
  showAddButton = false,
}: Props<TData, TValue>) {
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(100));

  const pageCount = Math.ceil(data.totalItems / pageSize);

  // Find the first data column (skip select column if it exists)
  const firstDataColumn = columns.find(
    (col) => col.id && col.id !== "select" && col.enablePinning
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
    },
  });

  return (
    <DataTable table={table}>
      <DataTableToolbar
        table={table}
        showImportButton={showImportButton}
        showAddButton={showAddButton}
      />
    </DataTable>
  );
}

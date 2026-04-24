"use client";

import { useState } from "react";
import { Meals1DataTable } from "./meals1-data-table";
import { DataTableToolbar } from "@/components/ui/table/data-table-toolbar";
import { BulkDeleteToolbar } from "./bulk-delete-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { MealProduct } from "@/types/meals1";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Meal1FullscreenForm from "@/components/forms/meal1-fullscreen-form";

interface Props {
  data: { data: MealProduct[]; totalItems: number };
  columns: ColumnDef<MealProduct, any>[];
}

export function Meals1DataTableWrapper({ data, columns }: Props) {
  const queryClient = useQueryClient();
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(100));
  const [newFormOpen, setNewFormOpen] = useState(false);
  const pageCount = Math.ceil(data.totalItems / pageSize);

  const firstDataColumn = columns.find((col) => col.id && col.id !== "actions" && (col as any).enablePinning);
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

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
  const hasSelection = selectedRows.length > 0;

  const handleNewSuccess = () => {
    setNewFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ["meals1"], exact: false, type: "active" });
  };

  return (
    <>
      <Meals1DataTable table={table}>
        <div className="flex items-center justify-between">
          {hasSelection ? (
            <BulkDeleteToolbar
              selectedRows={selectedRows}
              onClearSelection={() => table.resetRowSelection()}
            />
          ) : (
            <DataTableToolbar table={table}>
              <Button size="sm" onClick={() => setNewFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New Meal
              </Button>
            </DataTableToolbar>
          )}
        </div>
      </Meals1DataTable>

      <Meal1FullscreenForm
        isOpen={newFormOpen}
        onClose={() => setNewFormOpen(false)}
        initialData={null}
        onSuccess={handleNewSuccess}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { MealsDataTable } from "./meals-data-table";
import { DataTableToolbar } from "@/components/ui/table/data-table-toolbar";
import { BulkDeleteToolbar } from "./bulk-delete-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { MealProduct } from "@/types/meals";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import MealFullscreenForm from "@/components/forms/meal-fullscreen-form";

interface Props {
  data: { data: MealProduct[]; totalItems: number };
  columns: ColumnDef<MealProduct, any>[];
}

export function MealsDataTableWrapper({ data, columns }: Props) {
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
    queryClient.invalidateQueries({ queryKey: ["meals"], exact: false, type: "active" });
  };

  return (
    <>
      <MealsDataTable table={table}>
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
      </MealsDataTable>

      <MealFullscreenForm
        isOpen={newFormOpen}
        onClose={() => setNewFormOpen(false)}
        initialData={null}
        onSuccess={handleNewSuccess}
      />
    </>
  );
}

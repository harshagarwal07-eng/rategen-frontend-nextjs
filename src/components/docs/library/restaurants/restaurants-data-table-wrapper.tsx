"use client";

import { useState } from "react";
import { RestaurantsDataTable } from "./restaurants-data-table";
import { LibraryToolbar } from "../library-toolbar";
import { BulkDeleteToolbar } from "./bulk-delete-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { IRestaurant } from "@/types/docs";
import RestaurantFullscreenForm from "@/components/forms/library-forms/restaurant-form";
import { generateRestaurantColumns } from "./columns";

interface Props {
  data: { data: IRestaurant[]; totalItems: number };
  showAddButton?: boolean;
  loading?: boolean;
}

export function RestaurantsDataTableWrapper({
  data,
  showAddButton = true,
  loading = false,
}: Props) {
  const [isAddingRestaurant, setIsAddingRestaurant] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<IRestaurant | null>(null);
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(25));

  const pageCount = Math.ceil(data.totalItems / pageSize);

  const handleEdit = (restaurant: IRestaurant) => {
    setEditingRestaurant(restaurant);
  };

  const columns = generateRestaurantColumns(data.data, handleEdit);

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
      <RestaurantsDataTable table={table} loading={loading}>
        {hasSelection ? (
          <div className={loading ? "pointer-events-none opacity-60" : ""}>
            <BulkDeleteToolbar selectedRows={selectedRows} onClearSelection={handleClearSelection} />
          </div>
        ) : (
          <div className={loading ? "pointer-events-none opacity-60" : ""}>
            <LibraryToolbar
              table={table}
              showAddButton={showAddButton}
              onAddClick={() => setIsAddingRestaurant(true)}
              addButtonLabel="Add Restaurant"
              title="Restaurants Library"
            />
          </div>
        )}
      </RestaurantsDataTable>

      <RestaurantFullscreenForm
        isOpen={isAddingRestaurant}
        onClose={() => setIsAddingRestaurant(false)}
        onSuccess={() => setIsAddingRestaurant(false)}
      />

      {editingRestaurant && (
        <RestaurantFullscreenForm
          isOpen={!!editingRestaurant}
          onClose={() => setEditingRestaurant(null)}
          onSuccess={() => setEditingRestaurant(null)}
          initialData={editingRestaurant}
        />
      )}
    </>
  );
}

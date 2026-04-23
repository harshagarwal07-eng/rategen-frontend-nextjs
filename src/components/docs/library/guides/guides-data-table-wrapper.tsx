"use client";

import { useState } from "react";
import { GuidesDataTable } from "./guides-data-table";
import { LibraryToolbar } from "../library-toolbar";
import { BulkDeleteToolbar } from "./bulk-delete-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { IGuide } from "@/types/docs";
import GuideFullscreenForm from "@/components/forms/library-forms/guide-form";
import { generateGuideColumns } from "./columns";

interface Props {
  data: { data: IGuide[]; totalItems: number };
  showAddButton?: boolean;
  loading?: boolean;
}

export function GuidesDataTableWrapper({
  data,
  showAddButton = true,
  loading = false,
}: Props) {
  const [isAddingGuide, setIsAddingGuide] = useState(false);
  const [editingGuide, setEditingGuide] = useState<IGuide | null>(null);
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(25));

  const pageCount = Math.ceil(data.totalItems / pageSize);

  const handleEdit = (guide: IGuide) => {
    setEditingGuide(guide);
  };

  const columns = generateGuideColumns(data.data, handleEdit);

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
      <GuidesDataTable table={table} loading={loading}>
        {hasSelection ? (
          <div className={loading ? "pointer-events-none opacity-60" : ""}>
            <BulkDeleteToolbar selectedRows={selectedRows} onClearSelection={handleClearSelection} />
          </div>
        ) : (
          <div className={loading ? "pointer-events-none opacity-60" : ""}>
            <LibraryToolbar
              table={table}
              showAddButton={showAddButton}
              onAddClick={() => setIsAddingGuide(true)}
              addButtonLabel="Add Guide"
              title="Guides Library"
            />
          </div>
        )}
      </GuidesDataTable>

      <GuideFullscreenForm
        isOpen={isAddingGuide}
        onClose={() => setIsAddingGuide(false)}
        onSuccess={() => setIsAddingGuide(false)}
      />

      {editingGuide && (
        <GuideFullscreenForm
          isOpen={!!editingGuide}
          onClose={() => setEditingGuide(null)}
          onSuccess={() => setEditingGuide(null)}
          initialData={editingGuide}
        />
      )}
    </>
  );
}

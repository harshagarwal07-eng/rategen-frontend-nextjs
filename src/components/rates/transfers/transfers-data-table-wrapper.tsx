"use client";

import { useState } from "react";
import { TransfersDataTable } from "./transfers-data-table";
import { DataTableToolbar } from "@/components/ui/table/data-table-toolbar";
import { BulkDeleteToolbar } from "./bulk-delete-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { Transfer } from "@/types/transfers";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { TransferExcelDialog } from "./transfer-excel";

interface Props {
  data: { data: Transfer[]; totalItems: number };
  columns: ColumnDef<Transfer, any>[];
  showImportButton?: boolean;
  showAddButton?: boolean;
}

export function TransfersDataTableWrapper({
  data,
  columns,
  showImportButton = false,
  showAddButton = false,
}: Props) {
  const router = useRouter();
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(100));
  const [isExcelOpen, setIsExcelOpen] = useState(false);

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
        notes: false,
        examples: false,
        description: false,
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
    <>
      <TransfersDataTable table={table}>
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
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExcelOpen(true)}
              disabled={data.data.length === 0}
            >
              Open Excel
            </Button>
          </DataTableToolbar>
        )}
      </TransfersDataTable>

      <TransferExcelDialog
        isOpen={isExcelOpen}
        onClose={() => setIsExcelOpen(false)}
        transfers={data.data}
        onSaveSuccess={() => router.refresh()}
      />
    </>
  );
}

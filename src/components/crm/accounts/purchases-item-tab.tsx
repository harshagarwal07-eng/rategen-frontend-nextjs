"use client";

import * as React from "react";
import { parseAsInteger, useQueryState } from "nuqs";
import type { Row } from "@tanstack/react-table";
import { useNewTable } from "@/hooks/use-new-table";
import { DataTableWrapper } from "@/components/ui/new-table/data-table-wrapper";
import type { PurchaseByItem } from "@/types/ops-accounts";
import { generatePurchaseItemColumns } from "./purchases-item-columns";
import { ItemSuppliersSheet } from "./item-suppliers-sheet";

interface PurchasesItemTabProps {
  data: { data: PurchaseByItem[]; totalItems: number };
}

export function PurchasesItemTab({ data }: PurchasesItemTabProps) {
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(50));
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [startDate] = useQueryState("start_date");
  const [endDate] = useQueryState("end_date");
  const pageCount = Math.ceil(data.totalItems / pageSize);

  const [selectedItem, setSelectedItem] = React.useState<PurchaseByItem | null>(null);

  const columns = React.useMemo(() => generatePurchaseItemColumns(), []);

  const { table } = useNewTable({
    data: data.data,
    columns,
    pageCount,
    shallow: false,
    debounceMs: 500,
    enableRowSelection: false,
    initialState: {
      pagination: { pageSize: 50, pageIndex: 0 },
    },
  });

  const handleRowClick = React.useCallback((row: Row<PurchaseByItem>) => {
    setSelectedItem(row.original);
  }, []);

  return (
    <>
      <DataTableWrapper
        table={table}
        searchableColumns={["service_name"]}
        searchPlaceholder="Search service name..."
        showSearch
        showPagination
        showViewOptions
        showDateFilter
        dateFilterLabel="Service Date Range"
        showRefresh
        hasFilters={!!search}
        onReset={() => void setSearch(null)}
        emptyMessage="No purchases found for the selected period."
        onRowClick={handleRowClick}
      />

      <ItemSuppliersSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        startDate={startDate ?? undefined}
        endDate={endDate ?? undefined}
      />
    </>
  );
}

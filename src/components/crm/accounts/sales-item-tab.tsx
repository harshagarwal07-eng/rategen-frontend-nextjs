"use client";

import * as React from "react";
import { parseAsInteger, useQueryState } from "nuqs";
import type { Row } from "@tanstack/react-table";
import { useNewTable } from "@/hooks/use-new-table";
import { DataTableWrapper } from "@/components/ui/new-table/data-table-wrapper";
import type { SalesByItem } from "@/types/ops-accounts";
import { generateSalesItemColumns } from "./sales-item-columns";
import { ItemAgentsSheet } from "./item-agents-sheet";

interface SalesItemTabProps {
  data: { data: SalesByItem[]; totalItems: number };
}

export function SalesItemTab({ data }: SalesItemTabProps) {
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(50));
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [startDate] = useQueryState("start_date");
  const [endDate] = useQueryState("end_date");
  const pageCount = Math.ceil(data.totalItems / pageSize);

  const [selectedItem, setSelectedItem] = React.useState<SalesByItem | null>(null);

  const columns = React.useMemo(() => generateSalesItemColumns(), []);

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

  const handleRowClick = React.useCallback((row: Row<SalesByItem>) => {
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
        emptyMessage="No sales found for the selected period."
        onRowClick={handleRowClick}
      />

      <ItemAgentsSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        startDate={startDate ?? undefined}
        endDate={endDate ?? undefined}
      />
    </>
  );
}

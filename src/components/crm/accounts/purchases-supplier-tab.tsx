"use client";

import * as React from "react";
import { parseAsInteger, useQueryState } from "nuqs";
import type { Row } from "@tanstack/react-table";
import { useNewTable } from "@/hooks/use-new-table";
import { DataTableWrapper } from "@/components/ui/new-table/data-table-wrapper";
import type { PurchaseBySupplier } from "@/types/ops-accounts";
import { generatePurchaseSupplierColumns } from "./purchases-supplier-columns";
import { SupplierLedgerSheet } from "./supplier-ledger-sheet";

interface PurchasesSupplierTabProps {
  data: { data: PurchaseBySupplier[]; totalItems: number };
}

export function PurchasesSupplierTab({ data }: PurchasesSupplierTabProps) {
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(50));
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const pageCount = Math.ceil(data.totalItems / pageSize);

  const [selectedSupplier, setSelectedSupplier] = React.useState<PurchaseBySupplier | null>(null);

  const columns = React.useMemo(() => generatePurchaseSupplierColumns(), []);

  const { table } = useNewTable({
    data: data.data,
    columns,
    pageCount,
    shallow: false,
    debounceMs: 500,
    enableRowSelection: false,
    initialState: {
      pagination: { pageSize: 50, pageIndex: 0 },
      columnVisibility: { service_type: false },
    },
  });

  const handleRowClick = React.useCallback((row: Row<PurchaseBySupplier>) => {
    setSelectedSupplier(row.original);
  }, []);

  return (
    <>
      <DataTableWrapper
        table={table}
        searchableColumns={["supplier"]}
        searchPlaceholder="Search supplier, city, country..."
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

      <SupplierLedgerSheet
        supplier={selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
      />
    </>
  );
}

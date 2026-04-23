"use client";

import * as React from "react";
import { parseAsInteger, useQueryState } from "nuqs";
import type { Row } from "@tanstack/react-table";
import { useNewTable } from "@/hooks/use-new-table";
import { DataTableWrapper } from "@/components/ui/new-table/data-table-wrapper";
import type { SalesByAgent } from "@/types/ops-accounts";
import { generateSalesAgentColumns } from "./sales-agent-columns";
import { AgentLedgerSheet } from "./agent-ledger-sheet";

interface SalesAgentTabProps {
  data: { data: SalesByAgent[]; totalItems: number };
}

export function SalesAgentTab({ data }: SalesAgentTabProps) {
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(50));
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const pageCount = Math.ceil(data.totalItems / pageSize);

  const [selectedAgent, setSelectedAgent] = React.useState<SalesByAgent | null>(null);

  const columns = React.useMemo(() => generateSalesAgentColumns(), []);

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

  const handleRowClick = React.useCallback((row: Row<SalesByAgent>) => {
    setSelectedAgent(row.original);
  }, []);

  return (
    <>
      <DataTableWrapper
        table={table}
        searchableColumns={["agent"]}
        searchPlaceholder="Search agent, agency..."
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

      <AgentLedgerSheet
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
    </>
  );
}

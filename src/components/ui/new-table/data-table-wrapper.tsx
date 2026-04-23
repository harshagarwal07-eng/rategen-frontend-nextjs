"use client";

import { DataTable } from "@/components/ui/new-table/data-table";
import { DataTableToolbar } from "@/components/ui/new-table/data-table-toolbar";
import type { Row, Table as TanstackTable } from "@tanstack/react-table";
import type * as React from "react";

interface DataTableWrapperProps<TData> {
  table: TanstackTable<TData>;
  searchableColumns?: string[];
  searchPlaceholder?: string;
  showSearch?: boolean;
  showViewOptions?: boolean;
  showPagination?: boolean;
  emptyMessage?: string;
  actionBar?: React.ReactNode;
  toolbarActions?: React.ReactNode;
  toolbarLeft?: React.ReactNode;
  onReset?: () => void;
  hasFilters?: boolean;
  showDateFilter?: boolean;
  dateFilterLabel?: string;
  showRefresh?: boolean;
  renderExpandedRow?: (row: Row<TData>) => React.ReactNode;
  onRowClick?: (row: Row<TData>) => void;
}

export function DataTableWrapper<TData>({
  table,
  searchableColumns = [],
  searchPlaceholder = "Search...",
  showSearch = true,
  showViewOptions = true,
  showPagination = true,
  emptyMessage = "No results.",
  actionBar,
  toolbarActions,
  toolbarLeft,
  onReset,
  hasFilters,
  showDateFilter,
  dateFilterLabel,
  showRefresh,
  renderExpandedRow,
  onRowClick,
}: DataTableWrapperProps<TData>) {
  return (
    <DataTable table={table} actionBar={actionBar} showPagination={showPagination} emptyMessage={emptyMessage} renderExpandedRow={renderExpandedRow} onRowClick={onRowClick}>
      <DataTableToolbar
        table={table}
        searchableColumns={searchableColumns}
        searchPlaceholder={searchPlaceholder}
        showSearch={showSearch}
        showViewOptions={showViewOptions}
        onReset={onReset}
        hasFilters={hasFilters}
        toolbarLeft={toolbarLeft}
        showDateFilter={showDateFilter}
        dateFilterLabel={dateFilterLabel}
        showRefresh={showRefresh}
      >
        {toolbarActions}
      </DataTableToolbar>
    </DataTable>
  );
}

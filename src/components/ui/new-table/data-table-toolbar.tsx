"use client";

import type { Table } from "@tanstack/react-table";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw, XIcon } from "lucide-react";
import { DataTableViewOptions } from "@/components/ui/new-table/data-table-view-options";
import { DataTableGlobalSearch } from "@/components/ui/new-table/data-table-global-search";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { DateRangePicker } from "@/components/ui/new-table/date-range-picker";
import { parseAsString, useQueryStates } from "nuqs";

interface DataTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  searchableColumns?: string[];
  searchPlaceholder?: string;
  showSearch?: boolean;
  showViewOptions?: boolean;
  onReset?: () => void;
  hasFilters?: boolean;
  /** Render custom content in the left slot (before/instead of the default search) */
  toolbarLeft?: React.ReactNode;
  /** Show a date range picker (uses start_date / end_date URL params) */
  showDateFilter?: boolean;
  /** Label shown on the date range button when no range is selected */
  dateFilterLabel?: string;
  /** Show a refresh button that resets all table filters/state */
  showRefresh?: boolean;
}

export function DataTableToolbar<TData>({
  table,
  children,
  className,
  searchableColumns = [],
  searchPlaceholder = "Search...",
  showSearch = true,
  showViewOptions = true,
  onReset,
  hasFilters,
  toolbarLeft,
  showDateFilter = false,
  dateFilterLabel = "Date Range",
  showRefresh = false,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const [{ start_date, end_date }, setDateParams] = useQueryStates(
    { start_date: parseAsString, end_date: parseAsString },
    { shallow: false }
  );

  const hasDateFilter = showDateFilter && !!(start_date || end_date);
  const hasAnyFilters = !!(hasFilters || isFiltered || hasDateFilter);

  const handleReset = React.useCallback(() => {
    table.resetColumnFilters();
    if (showDateFilter) void setDateParams({ start_date: null, end_date: null });
    onReset?.();
  }, [table, onReset, showDateFilter, setDateParams]);

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn("flex w-full items-center justify-between gap-3 p-1", className)}
      {...props}
    >
      <div className="flex flex-1 items-center gap-2">
        {toolbarLeft}
        {showSearch && (
          <DataTableGlobalSearch table={table} searchableColumns={searchableColumns} placeholder={searchPlaceholder} />
        )}
        {hasAnyFilters && (
          <Button
            aria-label="Reset filters"
            variant="outline"
            size="sm"
            className="h-7 text-xs border-dashed"
            onClick={handleReset}
          >
            <XIcon />
            Reset Filters
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {children}

        {showDateFilter && (
          <DateRangePicker
            value={{ from: start_date, to: end_date }}
            onChange={(from, to) => void setDateParams({ start_date: from, end_date: to })}
            label={dateFilterLabel}
            align="end"
          />
        )}

        {showViewOptions && <DataTableViewOptions table={table} />}
        {showRefresh && (
          <>
            <div className="h-4 w-px bg-border" />
            <TooltipButton tooltip="Refresh" tooltipSide="bottom" size="icon-sm" variant="ghost" onClick={handleReset}>
              <RefreshCw className="h-3.5 w-3.5" />
            </TooltipButton>
          </>
        )}
      </div>
    </div>
  );
}

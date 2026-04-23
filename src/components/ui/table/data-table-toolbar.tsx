"use client";

import type { Column, Table } from "@tanstack/react-table";
import * as React from "react";

import { DataTableDateFilter } from "@/components/ui/table/data-table-date-filter";
import { DataTableFacetedFilter } from "@/components/ui/table/data-table-faceted-filter";
import { DataTableSliderFilter } from "@/components/ui/table/data-table-slider-filter";
import { DataTableViewOptions } from "@/components/ui/table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { XIcon, SearchIcon } from "lucide-react";
import { DataTableDBFilter } from "./data-table-db-filter";
import ImportButton from "@/components/rates/import-button";
import CreateDatastoreSheet from "@/components/datastore/create-datastore-sheet";
import { usePathname } from "next/navigation";
import Show from "../show";
import CreateSupplierSheet from "@/components/crm/suppliers/create-supplier-sheet";

interface DataTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  showImportButton?: boolean;
  showAddButton?: boolean;
}

export function DataTableToolbar<TData>({
  table,
  children,
  className,
  showImportButton = false,
  showAddButton = false,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const pathname = usePathname();
  const columns = React.useMemo(() => table.getAllColumns().filter((column) => column.getCanFilter()), [table]);
  const onReset = React.useCallback(() => {
    table.resetColumnFilters();
  }, [table]);

  const sheetSelector = () => {
    const pathParts = pathname.split("/");
    const sheetType = pathParts[1];

    switch (sheetType) {
      case "rates":
        return <CreateDatastoreSheet />;
      case "crm":
        // For CRM routes, check the third part of the path
        const crmType = pathParts[2];
        if (crmType === "suppliers") {
          return <CreateSupplierSheet />;
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn("flex w-full items-start justify-between gap-2 p-1", className)}
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {columns.map((column) => (
          <DataTableToolbarFilter key={column.id} column={column} />
        ))}
        {isFiltered && (
          <Button aria-label="Reset filters" variant="outline" size="sm" className="border-dashed" onClick={onReset}>
            <XIcon />
            Reset
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        <DataTableViewOptions table={table} />
        {showImportButton && <ImportButton />}

        <Show when={showAddButton}>{sheetSelector()}</Show>
      </div>
    </div>
  );
}
interface DataTableToolbarFilterProps<TData> {
  column: Column<TData>;
}

function DataTableToolbarFilter<TData>({ column }: DataTableToolbarFilterProps<TData>) {
  const columnMeta = column.columnDef.meta;
  const filterValue = column.getFilterValue();

  // Local state for text inputs to prevent slow typing
  const [localTextValue, setLocalTextValue] = React.useState<string>("");

  // Initialize local value from column filter
  React.useEffect(() => {
    if (columnMeta?.variant === "text") {
      const currentValue = (filterValue as string) ?? "";
      setLocalTextValue(currentValue);
    }
  }, [column, columnMeta?.variant, filterValue]);

  const handleTextSubmit = React.useCallback(() => {
    if (columnMeta?.variant === "text") {
      column.setFilterValue(localTextValue);
    }
  }, [column, localTextValue, columnMeta?.variant]);

  const onFilterRender = React.useCallback(() => {
    if (!columnMeta?.variant) return null;

    switch (columnMeta.variant) {
      case "text":
        return (
          <div className="relative">
            <Input
              placeholder={columnMeta.placeholder ?? columnMeta.label}
              value={localTextValue}
              onChange={(event) => setLocalTextValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleTextSubmit();
                }
              }}
              className="h-8 w-40 lg:w-60 pr-8"
            />
            <button
              type="button"
              onClick={handleTextSubmit}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Search"
            >
              <SearchIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        );

      case "number":
        return (
          <div className="relative">
            <Input
              type="number"
              inputMode="numeric"
              placeholder={columnMeta.placeholder ?? columnMeta.label}
              value={(column.getFilterValue() as string) ?? ""}
              onChange={(event) => column.setFilterValue(event.target.value)}
              className={cn("h-8 w-[120px]", columnMeta.unit && "pr-8")}
            />
            {columnMeta.unit && (
              <span className="bg-accent text-muted-foreground absolute top-0 right-0 bottom-0 flex items-center rounded-r-md px-2 text-sm">
                {columnMeta.unit}
              </span>
            )}
          </div>
        );

      case "range":
        return <DataTableSliderFilter column={column} title={columnMeta.label ?? column.id} />;

      case "date":
      case "dateRange":
        return (
          <DataTableDateFilter
            column={column}
            title={columnMeta.label ?? column.id}
            multiple={columnMeta.variant === "dateRange"}
          />
        );

      case "select":
      case "multiSelect":
        return (
          <DataTableFacetedFilter
            column={column}
            title={columnMeta.label ?? column.id}
            options={columnMeta.options ?? []}
            multiple={columnMeta.variant === "multiSelect"}
          />
        );

      case "multiSelectSearch":
        return (
          <DataTableDBFilter column={column} title={columnMeta.label ?? column.id} onSearch={columnMeta.onSearch} />
        );

      default:
        return null;
    }
  }, [column, columnMeta, localTextValue, handleTextSubmit]);

  return onFilterRender();
}

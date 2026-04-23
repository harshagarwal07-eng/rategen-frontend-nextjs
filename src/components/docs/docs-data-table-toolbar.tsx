"use client";

import type { Table } from "@tanstack/react-table";
import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { XIcon, Sparkles } from "lucide-react";
import { DataTableViewOptions } from "@/components/ui/table/data-table-view-options";
import { DataTableFacetedFilter } from "@/components/ui/table/data-table-faceted-filter";
import AddDocSheet from "./actions/add-doc-sheet";
import { Doc } from "@/types/docs";
import { IOption } from "@/types/common";

interface DocsDataTableToolbarProps extends React.ComponentProps<"div"> {
  table: Table<Doc>;
  title: string;
  docType: string;
  showNights: boolean;
  allowMultiplePerCountry: boolean;
  docs: Doc[];
  countries: IOption[];
}

export function DocsDataTableToolbar({
  table,
  className,
  title,
  docType,
  showNights,
  allowMultiplePerCountry,
  docs,
  countries,
  ...props
}: DocsDataTableToolbarProps) {
  const isFiltered = table.getState().columnFilters.length > 0;

  const countryColumn = table.getColumn("country_name");
  const statusColumn = table.getColumn("is_active");

  const onReset = React.useCallback(() => {
    table.resetColumnFilters();
  }, [table]);

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "flex items-center justify-between gap-4 p-1 w-full",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold whitespace-nowrap">{title}</h2>

        <div className="flex items-center gap-2">
          {countryColumn && (
            <DataTableFacetedFilter
              column={countryColumn}
              title="Country"
              options={countries.map((country) => ({
                label: country.label,
                value: country.label,
              }))}
            />
          )}

          {statusColumn && (
            <DataTableFacetedFilter
              column={statusColumn}
              title="Status"
              options={[
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" },
              ]}
            />
          )}

          {isFiltered && (
            <Button
              variant="ghost"
              onClick={onReset}
              className="h-8 px-2 lg:px-3 whitespace-nowrap"
            >
              Reset
              <XIcon className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {docType === "itineraries" ? (
          <Link href="/docs/itineraries/create">
            <Button size="sm" className="sm:min-w-40">
              <Sparkles className="h-4 w-4" />
              Build Itinerary
            </Button>
          </Link>
        ) : (
          <AddDocSheet
            allowMultiplePerCountry={allowMultiplePerCountry}
            docs={docs}
            title={title}
            docType={docType}
            showNights={showNights}
            countries={countries}
          />
        )}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}

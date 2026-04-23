"use client";

import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { Column, ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { CellAction } from "./cell-action";
import { Tour } from "@/types/tours";
import { EyePopover } from "@/components/ui/table/eye-popover";
import { CURRENCY_OPTIONS, CURRENCY_OPTIONS_LABEL } from "@/constants/data";
import { fetchCitiesBySearch, fetchCountriesBySearch } from "@/lib/table-utils";
import IndicateLocked from "@/components/common/indicate-locked";

export const generateTourColumns = (
  isDatastore: boolean = false,
  hideSearchFilter: boolean = false
): ColumnDef<Tour>[] => {
  const baseColumns: ColumnDef<Tour>[] = [
    // Always show actions column as first column
    ...(!isDatastore
      ? [
          {
            id: "actions",
            enablePinning: true,
            cell: ({ row }: { row: any }) => <CellAction data={row.original} />,
            enableSorting: false,
            enableHiding: false,
          },
        ]
      : []),
    {
      id: "tour_name",
      accessorKey: "tour_name",
      header: ({ column }: { column: Column<Tour, unknown> }) => (
        <DataTableColumnHeader column={column} title="Tour Name" style={{ width: "240px" }} />
      ),
      cell: ({ row }) => {
        const tour = row.original;
        const isLinked = !!tour.tour_datastore_id && !tour.is_unlinked;

        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {tour.tour_name}{" "}
              {isLinked && <IndicateLocked tooltip="This tour is linked to datastore" className="-mt-1" />}
            </span>
          </div>
        );
      },
      meta: hideSearchFilter
        ? undefined
        : {
            label: "Search",
            placeholder: "Search tours by name",
            variant: "text",
            icon: Search,
          },
      enableColumnFilter: !hideSearchFilter,
      enablePinning: true,
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      cell: ({ cell }) => {
        let value = cell.getValue<Tour["description"]>();

        if (value.length > 120) value = value.slice(0, 120) + "...";

        return <>{value || "-"}</>;
      },
      size: 400,
    },
    {
      id: "currency",
      accessorKey: "currency",
      header: "Currency",
      enableColumnFilter: !hideSearchFilter,
      meta: hideSearchFilter
        ? undefined
        : {
            label: "Currency",
            variant: "multiSelect",
            options: CURRENCY_OPTIONS,
          },
      cell: ({ cell }) => {
        return <div>{CURRENCY_OPTIONS_LABEL(cell.getValue<Tour["currency"]>())}</div>;
      },
    },
    {
      id: "country",
      accessorKey: "country_name",
      header: "Country",
      enableColumnFilter: !hideSearchFilter,
      meta: hideSearchFilter
        ? undefined
        : {
            label: "Country",
            variant: "multiSelectSearch",
            onSearch: fetchCountriesBySearch,
          },
    },
    {
      id: "city",
      accessorKey: "city_name",
      header: "City",
      enableColumnFilter: !hideSearchFilter,
      meta: hideSearchFilter
        ? undefined
        : {
            label: "City",
            variant: "multiSelectSearch",
            onSearch: fetchCitiesBySearch,
          },
    },
  ];

  // Add remaining columns
  baseColumns.push(
    {
      id: "preferred",
      accessorKey: "preferred",
      header: ({ column }: { column: Column<Tour, unknown> }) => (
        <DataTableColumnHeader column={column} title="Preferred" />
      ),
      cell: ({ cell }) => <div>{cell.getValue<Tour["preferred"]>() ? "Yes" : "No"}</div>,
    },
    {
      id: "packages_count",
      accessorKey: "packages",
      header: "Packages",
      cell: ({ row }) => {
        const packages = row.original.packages || [];
        return (
          <div className="text-center">
            <span className="font-medium">{packages.length}</span>
          </div>
        );
      },
    },
    {
      id: "addons_count",
      accessorKey: "add_ons",
      header: "Add-ons",
      cell: ({ row }) => {
        // Count global add-ons for this transfer
        const addOns = row.original.add_ons || [];

        return (
          <div className="text-center">
            <span className="font-medium">{addOns.length}</span>
          </div>
        );
      },
    },
    {
      id: "cancellation",
      accessorKey: "cancellation_policy",
      header: "Cancellation",
      cell: ({ cell }) => {
        return (
          <EyePopover title="Cancellation Policy" description={cell.getValue<Tour["cancellation_policy"]>() || "-"} />
        );
      },
    },
    {
      id: "remarks",
      accessorKey: "remarks",
      header: "AI Remarks",
      cell: ({ cell }) => {
        return <EyePopover title="AI Remarks" description={cell.getValue<Tour["remarks"]>() || "-"} />;
      },
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: "Notes",
      cell: ({ cell }) => {
        return <EyePopover title="Notes" description={cell.getValue<Tour["notes"]>() || "-"} />;
      },
    }
  );

  return baseColumns;
};

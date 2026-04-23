"use client";

import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { EyePopover } from "@/components/ui/table/eye-popover";
import { fetchCountriesBySearch } from "@/lib/table-utils";
import { ColumnDef, Column } from "@tanstack/react-table";
import CellAction from "./cell-action";
import { CURRENCY_OPTIONS, CURRENCY_OPTIONS_LABEL } from "@/constants/data";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { CarOnDisposal } from "@/types/car-on-disposal";
import { ImagesCell } from "@/components/ui/table/image-cell";

export const generateCarOnDisposalColumns = (
  isDatastore: boolean = false
): ColumnDef<CarOnDisposal>[] => {
  const baseColumns: ColumnDef<CarOnDisposal>[] = [
    ...(isDatastore
      ? [
          {
            id: "select",
            header: ({ table }: { table: any }) => (
              <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) =>
                  table.toggleAllPageRowsSelected(!!value)
                }
                aria-label="Select all"
              />
            ),
            cell: ({ row }: { row: any }) => (
              <Checkbox
                checked={row.getIsSelected()}
                disabled={!row.getCanSelect()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
              />
            ),
            enableSorting: false,
            enableColumnFilter: false,
          },
        ]
      : []),
    {
      id: "car on disposal",
      accessorKey: "name",
      header: ({ column }: { column: Column<CarOnDisposal, unknown> }) => (
        <DataTableColumnHeader
          column={column}
          title="Car On Disposal Name"
          style={{ width: "240px" }}
        />
      ),
      meta: {
        label: "Search",
        placeholder: "Search by name",
        variant: "text",
        icon: Search,
      },
      enableColumnFilter: true,
      enablePinning: true,
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      cell: ({ cell }) => {
        return (
          <EyePopover
            title="Description"
            description={cell.getValue<CarOnDisposal["description"]>() || "-"}
          />
        );
      },
    },
    {
      id: "images",
      header: "Images",
      cell: ({ row }) => (
        <ImagesCell
          images={row.original.images || []}
          docType="car-on-disposal"
        />
      ),
    },
    {
      id: "currency",
      accessorKey: "currency",
      header: "Currency",
      enableColumnFilter: true,
      meta: {
        label: "Currency",
        variant: "multiSelect",
        options: CURRENCY_OPTIONS,
      },
      cell: ({ cell }) => {
        return (
          <div>
            {CURRENCY_OPTIONS_LABEL(cell.getValue<CarOnDisposal["currency"]>())}
          </div>
        );
      },
    },
    {
      id: "country",
      accessorKey: "country_name",
      header: "Country",
      enableColumnFilter: true,
      meta: {
        label: "Country",
        variant: "multiSelectSearch",
        onSearch: fetchCountriesBySearch,
      },
    },

    // Grouped header for Km Based Pricing
    {
      id: "km based pricing",
      header: () => (
        <div className="text-center font-semibold">Km Based Pricing</div>
      ),
      columns: [
        {
          id: "rate per km",
          accessorKey: "rate_per_km",
          header: () => "Rate per km",
        },
        {
          id: "min km per day",
          accessorKey: "min_km_per_day",
          header: () => "Min km per Day",
        },
        {
          id: "max hrs per day",
          accessorKey: "max_hrs_per_day",
          header: () => "Max Hours/Day",
        },
        {
          id: "surcharge per hr",
          accessorKey: "surcharge_per_hr",
          header: () => "Surcharge/Hour",
        },
      ],
    },

    // Grouped header for Vehicle Based Pricing
    {
      id: "vehicle based pricing",
      header: () => (
        <div className="text-center font-semibold">Vehicle Based Pricing</div>
      ),
      columns: [
        {
          id: "vbp rate",
          accessorKey: "vbp_rate",
          header: () => "Rate",
        },
        {
          id: "vbp max hrs per day",
          accessorKey: "vbp_max_hrs_per_day",
          header: () => "Max Hours/Day",
        },
        {
          id: "vbp surcharge per hr",
          accessorKey: "vbp_surcharge_per_hr",
          header: () => "Surcharge/Hour",
        },
        {
          id: "vbp max km per day",
          accessorKey: "vbp_max_km_per_day",
          header: () => "Max Km/Day",
        },
        {
          id: "vbp surcharge per km",
          accessorKey: "vbp_surcharge_per_km",
          header: () => "Surcharge/km",
        },
      ],
    },
    {
      id: "preferred",
      accessorKey: "preferred",
      header: ({ column }: { column: Column<CarOnDisposal, unknown> }) => (
        <DataTableColumnHeader column={column} title="Preferred" />
      ),
      cell: ({ cell }) => (
        <div>{cell.getValue<CarOnDisposal["preferred"]>() ? "Yes" : "No"}</div>
      ),
    },
    {
      id: "markup",
      accessorKey: "markup",
      header: ({ column }: { column: Column<CarOnDisposal, unknown> }) => (
        <DataTableColumnHeader column={column} title="Markup" />
      ),
    },
    {
      id: "cancellation",
      accessorKey: "cancellation_policy",
      header: "Cancellation",
      cell: ({ cell }) => {
        return (
          <EyePopover
            title="Cancellation Policy"
            description={
              cell.getValue<CarOnDisposal["cancellation_policy"]>() || "-"
            }
          />
        );
      },
    },
    {
      id: "remarks",
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ cell }) => {
        return (
          <EyePopover
            title="Remarks"
            description={cell.getValue<CarOnDisposal["remarks"]>() || "-"}
          />
        );
      },
    },
    {
      id: "examples",
      accessorKey: "examples",
      header: "Examples",
      cell: ({ cell }) => {
        return (
          <EyePopover
            title="Examples"
            description={cell.getValue<CarOnDisposal["examples"]>() || "-"}
          />
        );
      },
    },
    {
      id: "actions",
      enablePinning: true,
      cell: ({ row }) => <CellAction data={row.original} />,
    },
  ];

  return baseColumns;
};

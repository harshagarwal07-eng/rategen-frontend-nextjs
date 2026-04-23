"use client";

import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { Search } from "lucide-react";
import { CURRENCY_OPTIONS, CURRENCY_OPTIONS_LABEL } from "@/constants/data";
import { Column, ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { EyePopover } from "@/components/ui/table/eye-popover";
import { Transfer } from "@/types/transfers";
import { ImagesCell } from "@/components/ui/table/image-cell";
import { fetchCitiesBySearch, fetchCountriesBySearch } from "@/lib/table-utils";
import IndicateLocked from "@/components/common/indicate-locked";

export const generateTransfersColumns = (isDatastore: boolean = false): ColumnDef<Transfer>[] => {
  const baseColumns: ColumnDef<Transfer>[] = [
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
      id: "transfer_name",
      accessorKey: "transfer_name",
      header: ({ column }: { column: Column<Transfer, unknown> }) => (
        <DataTableColumnHeader column={column} title="Transfer Name" style={{ width: "240px" }} />
      ),
      cell: ({ row }) => {
        const transfer = row.original;
        const isLinked = !!transfer.transfer_datastore_id && !transfer.is_unlinked;

        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {transfer.transfer_name}{" "}
              {isLinked && <IndicateLocked tooltip="This transfer is linked to datastore" className="-mt-1" />}
            </span>
          </div>
        );
      },
      meta: {
        label: "Search",
        placeholder: "Search transfers by name",
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
        let value = cell.getValue<Transfer["description"]>();

        if (value.length > 120) value = value.slice(0, 120) + "...";

        return <>{value || "-"}</>;
      },
      size: 400,
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
        return <div>{CURRENCY_OPTIONS_LABEL(cell.getValue<Transfer["currency"]>())}</div>;
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
    {
      id: "city",
      accessorKey: "city_name",
      header: "City",
      enableColumnFilter: true,
      meta: {
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
      header: ({ column }: { column: Column<Transfer, unknown> }) => (
        <DataTableColumnHeader column={column} title="Preferred" />
      ),
      cell: ({ cell }) => <div>{cell.getValue<Transfer["preferred"]>() ? "Yes" : "No"}</div>,
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
      id: "markup",
      accessorKey: "markup",
      header: ({ column }: { column: Column<Transfer, unknown> }) => (
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
            description={cell.getValue<Transfer["cancellation_policy"]>() || "-"}
          />
        );
      },
    },
    {
      id: "remarks",
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ cell }) => {
        return <EyePopover title="Remarks" description={cell.getValue<Transfer["remarks"]>() || "-"} />;
      },
    }
    // {
    //   id: "examples",
    //   accessorKey: "examples",
    //   header: "Examples",
    //   cell: ({ cell }) => {
    //     return (
    //       <EyePopover
    //         title="Examples"
    //         description={cell.getValue<Transfer["examples"]>() || "-"}
    //       />
    //     );
    //   },
    // },
  );

  return baseColumns;
};

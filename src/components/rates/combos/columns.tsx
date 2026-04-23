"use client";

import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { Column, ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { CellAction } from "./cell-action";
import { ICombo } from "@/components/forms/schemas/combos-datastore-schema";
import { EyePopover } from "@/components/ui/table/eye-popover";
import { CURRENCY_OPTIONS, CURRENCY_OPTIONS_LABEL } from "@/constants/data";

export const generateComboColumns = (): ColumnDef<ICombo>[] => {
  const columns: ColumnDef<ICombo>[] = [
    // Actions column
    {
      id: "actions",
      enablePinning: true,
      cell: ({ row }) => <CellAction data={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
    // Title column
    {
      id: "title",
      accessorKey: "title",
      header: ({ column }: { column: Column<ICombo, unknown> }) => (
        <DataTableColumnHeader column={column} title="Title" style={{ width: "240px" }} />
      ),
      meta: {
        label: "Search",
        placeholder: "Search combos by title",
        variant: "text",
        icon: Search,
      },
      enableColumnFilter: true,
      enablePinning: true,
    },
    // Description column
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      cell: ({ cell }) => {
        let value = cell.getValue<string>() || "";
        if (value.length > 120) value = value.slice(0, 120) + "...";
        return <>{value || "-"}</>;
      },
      size: 400,
    },
    // Country column
    {
      id: "country_name",
      accessorKey: "country_name",
      header: "Country",
      cell: ({ cell }) => {
        return <div>{cell.getValue<string>() || "-"}</div>;
      },
    },
    // City column
    {
      id: "city_name",
      accessorKey: "city_name",
      header: "City",
      cell: ({ cell }) => {
        return <div>{cell.getValue<string>() || "-"}</div>;
      },
    },
    // Currency column
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
        return <div>{CURRENCY_OPTIONS_LABEL(cell.getValue<string>())}</div>;
      },
    },
    // Items count column
    {
      id: "items_count",
      accessorKey: "items_count",
      header: "Packages",
      cell: ({ cell }) => {
        const count = cell.getValue<number>() || 0;
        return (
          <div className="text-center">
            <span className="font-medium">{count}</span>
          </div>
        );
      },
    },
    // Seasons count column
    {
      id: "seasons_count",
      accessorKey: "seasons_count",
      header: "Seasons",
      cell: ({ cell }) => {
        const count = cell.getValue<number>() || 0;
        return (
          <div className="text-center">
            <span className="font-medium">{count}</span>
          </div>
        );
      },
    },
    // AI Remarks column
    {
      id: "remarks",
      accessorKey: "remarks",
      header: "AI Remarks",
      cell: ({ cell }) => {
        return <EyePopover title="AI Remarks" description={cell.getValue<string>() || "-"} />;
      },
    },
  ];

  return columns;
};

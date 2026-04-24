"use client";

import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { Column, ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { CellAction } from "./cell-action";
import { Guide } from "@/types/guides";
import { CURRENCY_OPTIONS, CURRENCY_OPTIONS_LABEL } from "@/constants/data";
import { Badge } from "@/components/ui/badge";

export const generateGuidesColumns = (): ColumnDef<Guide>[] => {
  return [
    {
      id: "actions",
      enablePinning: true,
      cell: ({ row }) => <CellAction data={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }: { column: Column<Guide, unknown> }) => (
        <DataTableColumnHeader column={column} title="Name" style={{ width: "280px" }} />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.name}</span>
      ),
      meta: {
        label: "Search",
        placeholder: "Search guides...",
        variant: "text",
        icon: Search,
      },
      enableColumnFilter: true,
      enablePinning: true,
    },
    {
      id: "country",
      accessorKey: "country",
      header: "Country",
      cell: ({ row }) => row.original.country?.country_name || "-",
    },
    {
      id: "city",
      accessorKey: "city",
      header: "City",
      cell: ({ row }) => row.original.city?.city_name || "-",
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
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {CURRENCY_OPTIONS_LABEL(row.original.currency)}
        </Badge>
      ),
    },
    {
      id: "packages",
      accessorKey: "package_count",
      header: "Packages",
      cell: ({ row }) => (
        <span className="text-center block">{row.original.package_count ?? 0}</span>
      ),
    },
    {
      id: "status",
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];
};

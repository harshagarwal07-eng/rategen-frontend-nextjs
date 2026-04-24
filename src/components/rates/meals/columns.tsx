"use client";

import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { Column, ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { CellAction } from "./cell-action";
import { MealProduct } from "@/types/meals";
import { CURRENCY_OPTIONS, CURRENCY_OPTIONS_LABEL } from "@/constants/data";
import { fetchCountriesBySearch } from "@/lib/table-utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const generateMealsColumns = (): ColumnDef<MealProduct>[] => {
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
      header: ({ column }: { column: Column<MealProduct, unknown> }) => (
        <DataTableColumnHeader column={column} title="Name" style={{ width: "280px" }} />
      ),
      cell: ({ row }) => {
        const meal = row.original;
        return (
          <Link
            href={`/rates/meals/${meal.id}`}
            className="font-medium hover:underline text-foreground"
          >
            {meal.name}
          </Link>
        );
      },
      meta: {
        label: "Search",
        placeholder: "Search meals...",
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
      accessorKey: "location",
      header: "City",
      cell: ({ row }) => row.original.location?.city_name || "-",
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
  ];
};

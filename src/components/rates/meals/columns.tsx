"use client";

import { IMealsDatastore } from "@/components/forms/schemas/meals-datastore-schema";
import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { EyePopover } from "@/components/ui/table/eye-popover";
import { fetchCountriesBySearch } from "@/lib/table-utils";
import { ColumnDef, Column } from "@tanstack/react-table";
import { Search } from "lucide-react";
import CellAction from "./cell-action";
import { ImagesCell } from "@/components/ui/table/image-cell";
import { CURRENCY_OPTIONS, CURRENCY_OPTIONS_LABEL } from "@/constants/data";
import { Meal } from "@/types/meals";
import { Checkbox } from "@/components/ui/checkbox";
import IndicateLocked from "@/components/common/indicate-locked";

export const generateMealsColumns = (isDatastore: boolean = false): ColumnDef<IMealsDatastore>[] => {
  const baseColumns: ColumnDef<IMealsDatastore>[] = [
    ...(isDatastore
      ? [
          {
            id: "select",
            header: ({ table }: { table: any }) => (
              <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
      id: "meal_name",
      accessorKey: "meal_name",
      header: ({ column }: { column: Column<IMealsDatastore, unknown> }) => (
        <DataTableColumnHeader column={column} title="Meal Name" style={{ width: "240px" }} />
      ),
      cell: ({ row }) => {
        const meal = row.original;
        const isLinked = !!meal.meal_datastore_id && !meal.is_unlinked;

        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {meal.meal_name}{" "}
              {isLinked && <IndicateLocked tooltip="This meal is linked to datastore" className="-mt-1" />}
            </span>
          </div>
        );
      },
      meta: {
        label: "Search",
        placeholder: "Search meals by name",
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
        return <EyePopover title="Description" description={cell.getValue<IMealsDatastore["description"]>() || "-"} />;
      },
    },
    {
      id: "images",
      header: "Images",
      cell: ({ row }) => <ImagesCell images={row.original.images || []} docType="Meal" />,
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
        return <div>{CURRENCY_OPTIONS_LABEL(cell.getValue<Meal["currency"]>())}</div>;
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
      id: "meal_plan_rates",
      accessorKey: "meal_plan_rates",
      header: "Meal Rates",
      cell: ({ row }) => {
        const meal = row.original;
        const ratesCount = meal.meal_plan_rates?.length || 0;

        return (
          <div className="text-center">
            <span className="font-medium">{ratesCount}</span>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      id: "preferred",
      accessorKey: "preferred",
      header: ({ column }: { column: Column<IMealsDatastore, unknown> }) => (
        <DataTableColumnHeader column={column} title="Preferred" />
      ),
      cell: ({ cell }) => <div>{cell.getValue<IMealsDatastore["preferred"]>() ? "Yes" : "No"}</div>,
    },
    {
      id: "markup",
      accessorKey: "markup",
      header: ({ column }: { column: Column<IMealsDatastore, unknown> }) => (
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
            description={cell.getValue<IMealsDatastore["cancellation_policy"]>() || "-"}
          />
        );
      },
    },
    {
      id: "remarks",
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ cell }) => {
        return <EyePopover title="Remarks" description={cell.getValue<IMealsDatastore["remarks"]>() || "-"} />;
      },
    },
    {
      id: "examples",
      accessorKey: "examples",
      header: "Examples",
      cell: ({ cell }) => {
        return <EyePopover title="Examples" description={cell.getValue<IMealsDatastore["examples"]>() || "-"} />;
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

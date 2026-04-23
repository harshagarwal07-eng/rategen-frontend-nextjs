"use client";

import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { EyePopover } from "@/components/ui/table/eye-popover";
import { fetchCountriesBySearch } from "@/lib/table-utils";
import { ColumnDef, Column } from "@tanstack/react-table";
import CellAction from "./cell-action";
import { CURRENCY_OPTIONS, CURRENCY_OPTIONS_LABEL, GUIDE_TYPES } from "@/constants/data";
import { IGuidesDatastore } from "@/components/forms/schemas/guides-datastore-schema";
import { Guide } from "@/types/guide";
import { ImagesCell } from "@/components/ui/table/image-cell";
import IndicateLocked from "@/components/common/indicate-locked";

export const generateGuidesColumns = (isDatastore: boolean = false): ColumnDef<IGuidesDatastore>[] => {
  const baseColumns: ColumnDef<IGuidesDatastore>[] = [
    ...(!isDatastore
      ? [
          {
            id: "actions",
            enablePinning: true,
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }: { row: any }) => <CellAction data={row.original} />,
          },
        ]
      : []),
    {
      id: "guide_type",
      accessorKey: "guide_type",
      header: ({ column }: { column: Column<IGuidesDatastore, unknown> }) => (
        <DataTableColumnHeader column={column} title="Guide Type" style={{ width: "240px" }} />
      ),
      cell: ({ row }) => {
        const guide = row.original;
        const isLinked = !!guide.guide_datastore_id && !guide.is_unlinked;

        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {GUIDE_TYPES.find((v) => v.value === guide.guide_type)?.label}{" "}
              {isLinked && <IndicateLocked tooltip="This guide is linked to datastore" className="-mt-1" />}
            </span>
          </div>
        );
      },
      meta: {
        label: "Guide Type",
        variant: "multiSelect",
        options: GUIDE_TYPES,
      },
      enableColumnFilter: true,
      enablePinning: true,
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      cell: ({ cell }) => {
        return <EyePopover title="Description" description={cell.getValue<IGuidesDatastore["description"]>() || "-"} />;
      },
    },
    {
      id: "images",
      header: "Images",
      cell: ({ row }) => <ImagesCell images={row.original.images || []} docType="Guide" />,
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
        return <div>{CURRENCY_OPTIONS_LABEL(cell.getValue<Guide["currency"]>())}</div>;
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
      id: "per day rate",
      accessorKey: "per_day_rate",
      header: "Per Day Rate",
    },
    {
      id: "preferred",
      accessorKey: "preferred",
      header: ({ column }: { column: Column<IGuidesDatastore, unknown> }) => (
        <DataTableColumnHeader column={column} title="Preferred" />
      ),
      cell: ({ cell }) => <div>{cell.getValue<IGuidesDatastore["preferred"]>() ? "Yes" : "No"}</div>,
    },
    {
      id: "markup",
      accessorKey: "markup",
      header: ({ column }: { column: Column<IGuidesDatastore, unknown> }) => (
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
            description={cell.getValue<IGuidesDatastore["cancellation_policy"]>() || "-"}
          />
        );
      },
    },
    {
      id: "remarks",
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ cell }) => {
        return <EyePopover title="Remarks" description={cell.getValue<IGuidesDatastore["remarks"]>() || "-"} />;
      },
    },
    {
      id: "examples",
      accessorKey: "examples",
      header: "Examples",
      cell: ({ cell }) => {
        return <EyePopover title="Examples" description={cell.getValue<IGuidesDatastore["examples"]>() || "-"} />;
      },
    },
  ];

  return baseColumns;
};

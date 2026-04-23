"use client";

import { Column, ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { format } from "date-fns";
import { fetchCountriesBySearch } from "@/lib/table-utils";
import { Doc } from "@/types/docs";
import { Checkbox } from "@/components/ui/checkbox";
import { EyePopoverRich } from "@/components/ui/table/eye-popover-rich";

export const columns: ColumnDef<Doc>[] = [
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
  {
    id: "title",
    accessorKey: "title",
    header: ({ column }: { column: Column<Doc, unknown> }) => (
      <DataTableColumnHeader
        column={column}
        title="Title"
        style={{ width: "240px" }}
      />
    ),
    meta: {
      label: "Title",
      placeholder: "Search docs by title",
      variant: "text",
      icon: Search,
    },
    enableColumnFilter: true,
    enablePinning: true,
  },
  {
    id: "content",
    accessorKey: "content",
    header: "Content",
    cell: ({ cell }) => {
      return (
        <EyePopoverRich
          title="Content"
          description={cell.getValue<Doc["content"]>() || "-"}
        />
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
  {
    id: "type",
    accessorKey: "type",
    header: ({ column }: { column: Column<Doc, unknown> }) => (
      <DataTableColumnHeader
        column={column}
        title="Type"
        style={{ width: "240px" }}
      />
    ),
    cell: ({ cell }) => {
      return (
        <Badge variant="secondary" className="capitalize">
          {cell.getValue<Doc["type"]>()}
        </Badge>
      );
    },
  },
  {
    id: "is_active",
    accessorKey: "is_active",
    header: ({ column }: { column: Column<Doc, unknown> }) => (
      <DataTableColumnHeader
        column={column}
        title="Is Active"
        style={{ width: "240px" }}
      />
    ),
    meta: {
      label: "Active",
      variant: "select",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    },
    cell: ({ cell }) => {
      return (
        <Badge
          variant={cell.getValue<Doc["is_active"]>() ? "default" : "outline"}
        >
          {cell.getValue<Doc["is_active"]>() ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: ({ column }: { column: Column<Doc, unknown> }) => (
      <DataTableColumnHeader
        column={column}
        title="Created At"
        style={{ width: "240px" }}
      />
    ),
    cell: ({ cell }) => {
      return <div>{format(cell.getValue<Doc["created_at"]>(), "PP")}</div>;
    },
  },
];

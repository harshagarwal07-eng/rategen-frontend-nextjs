"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { IRestaurant, LibraryItemStatus } from "@/types/docs";
import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { CellAction } from "./cell-actions";
import { fetchCountriesBySearch, fetchCitiesBySearch } from "@/lib/table-utils";

export const generateRestaurantColumns = (
  _restaurants: IRestaurant[],
  onEdit?: (restaurant: IRestaurant) => void
): ColumnDef<IRestaurant>[] => {
  return [
    {
      id: "actions",
      enablePinning: true,
      cell: ({ row }) => <CellAction data={row.original} onEdit={onEdit} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Restaurant Name" />,
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return <span className="font-medium">{name || "-"}</span>;
      },
      enableSorting: true,
      enablePinning: true,
      enableColumnFilter: true,
      meta: {
        label: "Restaurant Name",
        variant: "text",
        placeholder: "Search restaurant name...",
      },
    },
    {
      id: "phone",
      accessorKey: "phone",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phone" />,
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string;
        return <span>{phone || "-"}</span>;
      },
      enableSorting: false,
    },
    {
      id: "whatsapp",
      accessorKey: "whatsapp",
      header: ({ column }) => <DataTableColumnHeader column={column} title="WhatsApp" />,
      cell: ({ row }) => {
        const whatsapp = row.getValue("whatsapp") as string;
        return <span>{whatsapp || "-"}</span>;
      },
      enableSorting: false,
    },
    {
      id: "poc_name",
      accessorKey: "poc_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contact Person" />,
      cell: ({ row }) => {
        const pocName = row.getValue("poc_name") as string;
        return <span>{pocName || "-"}</span>;
      },
      enableSorting: true,
    },
    {
      id: "country",
      accessorKey: "country_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Country" />,
      cell: ({ row }) => {
        const countryName = row.original.country_name;
        return <span>{countryName || "-"}</span>;
      },
      enableSorting: false,
      enableColumnFilter: true,
      meta: {
        label: "Country",
        variant: "multiSelectSearch",
        onSearch: fetchCountriesBySearch,
      },
    },
    {
      id: "state_name",
      accessorKey: "state_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="State" />,
      cell: ({ row }) => {
        const stateName = row.getValue("state_name") as string;
        return <span>{stateName || "-"}</span>;
      },
      enableSorting: false,
    },
    {
      id: "city",
      accessorKey: "city_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="City" />,
      cell: ({ row }) => {
        const cityName = row.original.city_name;
        return <span>{cityName || "-"}</span>;
      },
      enableSorting: false,
      enableColumnFilter: true,
      meta: {
        label: "City",
        variant: "multiSelectSearch",
        onSearch: fetchCitiesBySearch,
      },
    },
    {
      id: "address",
      accessorKey: "address",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Address" />,
      cell: ({ row }) => {
        const address = row.getValue("address") as string;
        return <span className="max-w-[300px] truncate">{address || "-"}</span>;
      },
      enableSorting: false,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue("status") as LibraryItemStatus;
        const variant = status === "active" ? "default" : status === "inactive" ? "secondary" : "destructive";
        return (
          <Badge variant={variant} className="capitalize">
            {status}
          </Badge>
        );
      },
      enableSorting: true,
      enableHiding: false,
      enableColumnFilter: true,
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: [
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
          { label: "Archived", value: "archived" },
        ],
      },
    },
  ];
};

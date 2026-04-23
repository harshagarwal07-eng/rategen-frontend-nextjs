"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { IVehicle, LibraryItemStatus } from "@/types/docs";
import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { CellAction } from "./cell-actions";
import { ImagesCell } from "@/components/ui/table/image-cell";
import Show from "@/components/ui/show";
import { VEHICLE_CATEGORIES, VEHICLE_TYPES } from "@/constants/data";
import { LIBRARY_STATUS_CONFIGS } from "@/lib/status-styles-config";
import { fetchCountriesBySearch, fetchCitiesBySearch } from "@/lib/table-utils";

export const generateVehicleColumns = (
  _vehicles: IVehicle[],
  onEdit?: (vehicle: IVehicle) => void,
  onDelete?: (id: string) => void
): ColumnDef<IVehicle>[] => {
  return [
    {
      id: "actions",
      enablePinning: true,
      cell: ({ row }) => <CellAction data={row.original} onEdit={onEdit} onDelete={onDelete} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "v_number",
      accessorKey: "v_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vehicle Number" />,
      cell: ({ row }) => {
        const vNumber = row.getValue("v_number") as string;
        return <span className="font-medium">{vNumber || "-"}</span>;
      },
      enableSorting: true,
      enablePinning: true,
      enableColumnFilter: true,
      meta: {
        label: "Vehicle Number",
        variant: "text",
        placeholder: "Search vehicle number...",
      },
    },
    {
      id: "brand",
      accessorKey: "brand",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Brand" />,
      cell: ({ row }) => {
        const brand = row.getValue("brand") as string;
        return <span>{brand || "-"}</span>;
      },
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        label: "Brand",
        variant: "text",
        placeholder: "Search brand...",
      },
    },
    {
      id: "v_type",
      accessorKey: "v_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => {
        const vType = row.getValue("v_type") as string;
        return <span>{vType || "-"}</span>;
      },
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        label: "Type",
        variant: "multiSelect",
        options: VEHICLE_TYPES,
      },
    },
    {
      id: "category",
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => {
        const category = row.getValue("category") as string;
        return <span>{category || "-"}</span>;
      },
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        label: "Category",
        variant: "multiSelect",
        options: VEHICLE_CATEGORIES,
      },
    },
    {
      id: "yr_of_reg",
      accessorKey: "yr_of_reg",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Year Of Registration" />,
      cell: ({ row }) => {
        const year = row.getValue("yr_of_reg") as number;
        return <span>{year || "-"}</span>;
      },
      enableSorting: true,
    },
    {
      id: "owned_by_type",
      accessorKey: "owned_by_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
      cell: ({ row }) => {
        const vehicle = row.original;
        const ownedByType = vehicle.owned_by_type;
        if (!ownedByType) return "-";

        return (
          <>
            <Show when={ownedByType === "company"}>
              <span className="capitalize">Company Owned</span>
            </Show>

            <Show when={ownedByType === "supplier"}>
              <span className="capitalize">
                Supplier
                <Show when={!!vehicle.supplier_name}>
                  {" - "}
                  {vehicle.supplier_name}
                </Show>
              </span>
            </Show>

            <Show when={ownedByType === "custom"}>
              <span className="capitalize">
                Custom
                <Show when={!!vehicle.owned_by_notes}>
                  {" - "}
                  {vehicle.owned_by_notes}
                </Show>
              </span>
            </Show>
          </>
        );
      },
      enableSorting: false,
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
      id: "images",
      accessorKey: "images",
      header: "Images",
      cell: ({ row }) => {
        const images = row.getValue("images") as string[] | undefined;
        return <ImagesCell images={images || []} docType="Vehicle" />;
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
        options: LIBRARY_STATUS_CONFIGS,
      },
    },
  ];
};

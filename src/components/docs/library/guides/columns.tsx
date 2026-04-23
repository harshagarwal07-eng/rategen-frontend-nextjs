"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { IGuide, LibraryItemStatus } from "@/types/docs";
import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { CellAction } from "./cell-actions";
import { ImagesCell } from "@/components/ui/table/image-cell";
import Show from "@/components/ui/show";
import { GENDERS, PAYROLL_TYPES } from "@/constants/data";
import { LIBRARY_STATUS_CONFIGS } from "@/lib/status-styles-config";
import { fetchCountriesBySearch, fetchCitiesBySearch } from "@/lib/table-utils";

export const generateGuideColumns = (_guides: IGuide[], onEdit?: (guide: IGuide) => void): ColumnDef<IGuide>[] => {
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Guide Name" />,
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return <span className="font-medium">{name || "-"}</span>;
      },
      enableSorting: true,
      enablePinning: true,
      enableColumnFilter: true,
      meta: {
        label: "Guide Name",
        variant: "text",
        placeholder: "Search guide name...",
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
      id: "whatsapp_number",
      accessorKey: "whatsapp_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="WhatsApp" />,
      cell: ({ row }) => {
        const whatsapp = row.getValue("whatsapp_number") as string;
        return <span>{whatsapp || "-"}</span>;
      },
      enableSorting: false,
    },
    {
      id: "gender",
      accessorKey: "gender",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Gender" />,
      cell: ({ row }) => {
        const gender = row.getValue("gender") as string;
        return <span className="capitalize">{gender || "-"}</span>;
      },
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        label: "Gender",
        variant: "multiSelect",
        options: GENDERS,
      },
    },
    {
      id: "languages_known",
      accessorKey: "languages_known",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Languages" />,
      cell: ({ row }) => {
        const languages = row.getValue("languages_known") as string[];
        if (!languages || languages.length === 0) return "-";
        return <div className="flex flex-wrap gap-1">{languages.join(", ")}</div>;
      },
      enableSorting: false,
    },
    {
      id: "payroll_type",
      accessorKey: "payroll_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Payroll" />,
      cell: ({ row }) => {
        const guide = row.original;
        const payrollType = guide.payroll_type;
        if (!payrollType) return "-";

        return (
          <span className="capitalize">
            {payrollType}
            <Show when={payrollType === "supplier" && !!guide.supplier_name}>
              {" - "}
              {guide.supplier_name}
            </Show>
          </span>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        label: "Payroll",
        variant: "multiSelect",
        options: PAYROLL_TYPES,
      },
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
        return <ImagesCell images={images || []} docType="Guide" />;
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

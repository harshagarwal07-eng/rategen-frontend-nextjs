"use client";

import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { Column, ColumnDef } from "@tanstack/react-table";
import { Search, EyeIcon } from "lucide-react";
import { CellAction } from "./cell-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ISupplierData, ItemTypes } from "@/types/suppliers";

export const generateSupplierColumns = (): ColumnDef<ISupplierData>[] => {
  const columns: ColumnDef<ISupplierData>[] = [
    // Actions column
    {
      id: "actions",
      enablePinning: true,
      cell: ({ row }) => <CellAction supplier={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
    // Name column
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }: { column: Column<ISupplierData, unknown> }) => (
        <DataTableColumnHeader column={column} title="Supplier Name" />
      ),
      meta: {
        label: "Search",
        placeholder: "Search suppliers by name",
        variant: "text",
        icon: Search,
      },
      enableColumnFilter: true,
      enablePinning: true,
      size: 350,
    },
    {
      id: "country_name",
      accessorKey: "country_name",
      header: "Country",
    },
    {
      id: "city_name",
      accessorKey: "city_name",
      header: "City",
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Category",
      cell: ({ cell }) => {
        return <div className="capitalize tracking-wide">{cell.getValue<ItemTypes[]>()?.join(", ") || "-"}</div>;
      },
    },
    {
      id: "booking_mode",
      accessorKey: "booking_mode",
      header: "Booking Mode",
    },
    // Website column
    {
      id: "website",
      accessorKey: "website",
      header: "Website",
      cell: ({ cell }) => {
        return <div>{cell.getValue<string>() || "-"}</div>;
      },
    },
    // Contacts column
    {
      id: "contacts",
      accessorKey: "contacts",
      header: "Contacts",
      cell: ({ cell }) => {
        const contacts = cell.getValue<ISupplierData["contacts"]>() || [];
        if (contacts.length === 0) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <EyeIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">Contacts ({contacts.length})</p>
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="border-b pb-2 last:border-0">
                      <p className="font-medium text-sm">
                        {contact.name}
                        {contact.department && contact.department.length > 0 && (
                          <span className="text-muted-foreground"> ({contact.department.join(", ")})</span>
                        )}
                      </p>

                      <div className="text-xs text-muted-foreground">{contact.email}</div>
                      {contact.phone && <div className="text-xs text-muted-foreground">{contact.phone}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      },
    },
    // Status column
    {
      id: "is_active",
      accessorKey: "is_active",
      header: "Status",
      enableColumnFilter: true,
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: [
          { label: "Active", value: "true" },
          { label: "Inactive", value: "false" },
        ],
      },
      cell: ({ cell }) => {
        const isActive = cell.getValue<boolean>();
        return <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>;
      },
    },
  ];

  return columns;
};

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Trash2, MoreHorizontal } from "lucide-react";
import type { ITaskLibrary } from "@/types/tasks";
import { DataTableColumnFilter } from "@/components/ui/new-table/data-table-column-filter";
import { TASK_REFERENCE_TYPES, TASK_CATEGORIES } from "@/constants/data";

function formatTiming(def: ITaskLibrary): string {
  const dir = def.offset_direction === "before" ? "before" : "after";
  const unit = def.offset_unit + (def.offset_value !== 1 ? "s" : "");
  const ref = TASK_REFERENCE_TYPES.find((t) => t.value === def.offset_reference)?.label ?? def.offset_reference;
  if (def.offset_value === 0) return `At ${ref}`;
  return `${def.offset_value} ${unit} ${dir} ${ref}`;
}

function formatApplyTo(def: ITaskLibrary): string {
  if (def.apply_to === "all") return "All Services";
  if (def.apply_to === "service_type") {
    const types = def.service_types ?? [];
    return types.length > 0 ? types.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ") : "—";
  }
  return "Specific Item";
}

const APPLIES_TO_OPTIONS = [
  { value: "all", label: "All Services" },
  { value: "hotel", label: "Hotel" },
  { value: "tour", label: "Tour" },
  { value: "transfer", label: "Transfer" },
  { value: "meal", label: "Meal" },
  { value: "guide", label: "Guide" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function generateTaskColumns(
  onEdit: (task: ITaskLibrary) => void,
  onDelete: (id: string) => void
): ColumnDef<ITaskLibrary>[] {
  return [
    {
      id: "task",
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Task Name" enableFiltering={false} />,
      cell: ({ row }) => <p className="text-sm font-medium leading-snug max-w-xs">{row.original.name}</p>,
      enableSorting: true,
      enablePinning: true,
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.original.category;
        const labelEntry = TASK_CATEGORIES.find((c) => c.value === category);
        return category ? (
          <Badge variant="outline" className="text-xs capitalize">
            {labelEntry?.label ?? category}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
      enableSorting: false,
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-2">{row.original.description || "-"}</span>
      ),
      enableSorting: false,
    },
    {
      id: "applies_to",
      accessorFn: (row) => {
        if (row.apply_to === "all") return ["all"];
        if (row.apply_to === "service_type") return row.service_types ?? [];
        return [];
      },
      header: ({ column }) => (
        <DataTableColumnFilter
          column={column}
          title="Applies To"
          options={APPLIES_TO_OPTIONS}
          enableSorting={false}
          enableFiltering={true}
        />
      ),
      cell: ({ row }) => <span className="text-sm">{formatApplyTo(row.original)}</span>,
      filterFn: (row, _columnId, filterValues: string[]) => {
        if (!filterValues.length) return true;
        const task = row.original;
        if (filterValues.includes("all") && task.apply_to === "all") return true;
        if (task.apply_to === "service_type" && task.service_types) {
          return task.service_types.some((t) => filterValues.includes(t));
        }
        return false;
      },
      enableSorting: false,
    },
    {
      id: "timing",
      accessorKey: "offset_reference",
      header: ({ column }) => (
        <DataTableColumnFilter
          column={column}
          title="Timing"
          options={[...TASK_REFERENCE_TYPES]}
          enableSorting={true}
          enableFiltering={true}
        />
      ),
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatTiming(row.original)}</span>,
      filterFn: (row, _columnId, filterValues: string[]) => {
        if (!filterValues.length) return true;
        return filterValues.includes(row.original.offset_reference);
      },
      enableSorting: true,
    },
    {
      id: "status",
      accessorFn: (row) => (row.is_active ? "active" : "inactive"),
      header: ({ column }) => (
        <DataTableColumnFilter
          column={column}
          title="Status"
          options={STATUS_OPTIONS}
          enableSorting={true}
          enableFiltering={true}
        />
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"} className="text-xs">
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValues: string[]) => {
        if (!filterValues.length) return true;
        const val = row.original.is_active ? "active" : "inactive";
        return filterValues.includes(val);
      },
      enableSorting: true,
    },
    {
      id: "actions",
      enablePinning: true,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(row.original.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

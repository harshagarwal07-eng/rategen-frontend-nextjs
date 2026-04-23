"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  Row,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Generic interfaces for different data types
export interface BaseRowData {
  id: string;
  [key: string]: any;
}

export interface ExpandableTableColumn<T> extends Omit<ColumnDef<T>, "id"> {
  id: string;
  accessorKey: keyof T;
  header: string;
  width?: string;
  sortable?: boolean;
}

export interface ExpandableTableProps<T extends BaseRowData> {
  data: T[];
  columns: ExpandableTableColumn<T>[];
  renderExpandedContent: (row: T) => React.ReactNode;
  searchColumn?: keyof T;
  searchPlaceholder?: string;
  title?: string;
  emptyMessage?: string;
  showColumnVisibility?: boolean;
  showPagination?: boolean;
  defaultExpanded?: string[];
}

export default function ExpandableDataTable<T extends BaseRowData>({
  data,
  columns,
  renderExpandedContent,
  searchColumn,
  searchPlaceholder = "Search...",
  title,
  emptyMessage = "No results found.",
  showColumnVisibility = true,
  showPagination = true,
  defaultExpanded = [],
}: ExpandableTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(
    new Set(defaultExpanded)
  );

  // Create table columns with expand trigger
  const tableColumns: ColumnDef<T>[] = React.useMemo(() => {
    const expandColumn: ColumnDef<T> = {
      id: "expand",
      header: "",
      cell: ({ row }) => {
        const isExpanded = expandedRows.has(row.original.id);
        return (
          <Collapsible open={isExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  const newExpanded = new Set(expandedRows);
                  if (isExpanded) {
                    newExpanded.delete(row.original.id);
                  } else {
                    newExpanded.add(row.original.id);
                  }
                  setExpandedRows(newExpanded);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {isExpanded ? "Collapse" : "Expand"}
                </span>
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        );
      },
      enableSorting: false,
      enableHiding: false,
      size: 40,
    };

    const dataColumns: ColumnDef<T>[] = columns.map((col) => ({
      id: col.id,
      accessorKey: col.accessorKey,
      header:
        col.sortable !== false
          ? ({ column }) => (
              <Button
                variant="ghost"
                onClick={() =>
                  column.toggleSorting(column.getIsSorted() === "asc")
                }
                className="h-auto p-0 font-medium"
              >
                {col.header}
              </Button>
            )
          : col.header,
      cell:
        col.cell ||
        (({ row }) => (
          <div className="font-medium">
            {row.getValue(col.accessorKey as string)}
          </div>
        )),
      enableSorting: col.sortable !== false,
      size: col.width ? parseInt(col.width) : undefined,
    }));

    return [expandColumn, ...dataColumns];
  }, [columns, expandedRows]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const ExpandableRow = ({ row }: { row: Row<T> }) => {
    const isExpanded = expandedRows.has(row.original.id);

    return (
      <Collapsible open={isExpanded}>
        <TableRow data-state={isExpanded ? "expanded" : undefined}>
          {row.getVisibleCells().map((cell) => (
            <TableCell
              key={cell.id}
              className={cell.column.id === "expand" ? "w-10" : undefined}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
        <CollapsibleContent asChild>
          <TableRow>
            <TableCell
              colSpan={row.getVisibleCells().length}
              className="p-0 bg-muted/20"
            >
              <div className="p-4 border-t border-border/50">
                {renderExpandedContent(row.original)}
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Header Section */}
      {(title || searchColumn || showColumnVisibility) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {title && (
              <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            )}
            {searchColumn && (
              <Input
                placeholder={searchPlaceholder}
                value={
                  (table
                    .getColumn(searchColumn as string)
                    ?.getFilterValue() as string) ?? ""
                }
                onChange={(event) =>
                  table
                    .getColumn(searchColumn as string)
                    ?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
              />
            )}
          </div>

          {showColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Table Section */}
      <div className="overflow-hidden rounded-lg border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.id === "expand" ? "w-10" : undefined}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table
                .getRowModel()
                .rows.map((row) => <ExpandableRow key={row.id} row={row} />)
            ) : (
              <TableRow>
                <TableCell
                  colSpan={tableColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Section */}
      {showPagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {data.length} row(s)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

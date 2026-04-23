"use client";

import { type Table as TanstackTable, flexRender } from "@tanstack/react-table";
import type * as React from "react";

import { DataTablePagination } from "@/components/ui/table/data-table-pagination";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCommonPinningStyles } from "@/lib/data-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Hotel } from "@/types/hotels";
import { Checkbox } from "@/components/ui/checkbox";

interface HotelsDataTableProps extends React.ComponentProps<"div"> {
  table: TanstackTable<Hotel>;
  actionBar?: React.ReactNode;
  loading?: boolean;
}

export function HotelsDataTable({ table, actionBar, children, loading = false }: HotelsDataTableProps) {
  return (
    <div className="flex flex-1 flex-col space-y-4">
      {children}
      <div className="relative flex flex-1">
        <div className="absolute inset-0 flex overflow-hidden rounded-lg border">
          <ScrollArea className="h-full w-full">
            <div className="relative w-full">
              <table className={`w-full caption-bottom text-sm ${loading ? "opacity-70" : ""}`}>
                <TableHeader className={`sticky top-0 z-10 bg-background ${loading ? "pointer-events-none" : ""}`}>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {/* Add checkbox column header */}
                      <TableHead className="w-[50px] min-w-[50px] max-w-[50px] bg-muted border-r border-border">
                        <Checkbox
                          checked={
                            table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
                          }
                          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                          disabled={loading}
                          aria-label="Select all"
                          className="translate-y-[2px]"
                        />
                      </TableHead>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          style={{
                            ...getCommonPinningStyles({
                              column: header.column,
                              isHeader: true,
                            }),
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                        {/* Checkbox cell - always first */}
                        <TableCell className="w-[50px] min-w-[50px] max-w-[50px] bg-background border-r border-border">
                          <Checkbox
                            checked={row.getIsSelected()}
                            onCheckedChange={(value) => row.toggleSelected(!!value)}
                            aria-label="Select row"
                            className="translate-y-[2px]"
                            disabled={loading}
                          />
                        </TableCell>
                        {/* Regular table cells */}
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            style={{
                              ...getCommonPinningStyles({
                                column: cell.column,
                              }),
                            }}
                            className="bg-background"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={table.getAllColumns().length + 1}
                        className="h-24 text-center pointer-events-none"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
      <div className={`flex flex-col gap-2.5 ${loading ? "pointer-events-none opacity-60" : ""}`}>
        <DataTablePagination table={table} disabled={loading} />
        {actionBar && table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
      </div>
    </div>
  );
}

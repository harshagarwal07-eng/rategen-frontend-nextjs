"use client";

import { type Table as TanstackTable, flexRender } from "@tanstack/react-table";
import type * as React from "react";

import { DataTablePagination } from "@/components/ui/table/data-table-pagination";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCommonPinningStyles } from "@/lib/data-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Guide } from "@/types/guides";
import { Checkbox } from "@/components/ui/checkbox";

interface GuidesDataTableProps extends React.ComponentProps<"div"> {
  table: TanstackTable<Guide>;
  actionBar?: React.ReactNode;
}

export function GuidesDataTable({ table, actionBar, children }: GuidesDataTableProps) {
  return (
    <div className="flex flex-1 flex-col space-y-4">
      {children}
      <div className="relative flex flex-1">
        <div className="absolute inset-0 flex overflow-hidden rounded-lg border">
          <ScrollArea className="h-full w-full">
            <div className="relative w-full">
              <table className="w-full caption-bottom text-sm">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      <TableHead className="w-[50px] min-w-[50px] max-w-[50px] bg-muted border-r border-border">
                        <Checkbox
                          checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && "indeterminate")
                          }
                          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                          aria-label="Select all"
                          className="translate-y-[2px]"
                        />
                      </TableHead>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          style={{ ...getCommonPinningStyles({ column: header.column, isHeader: true }) }}
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
                        <TableCell className="w-[50px] min-w-[50px] max-w-[50px] bg-background border-r border-border">
                          <Checkbox
                            checked={row.getIsSelected()}
                            onCheckedChange={(value) => row.toggleSelected(!!value)}
                            aria-label="Select row"
                            className="translate-y-[2px]"
                          />
                        </TableCell>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            style={{ ...getCommonPinningStyles({ column: cell.column }) }}
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
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} />
        {actionBar && table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
      </div>
    </div>
  );
}

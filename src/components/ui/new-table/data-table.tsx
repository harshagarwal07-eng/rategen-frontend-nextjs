"use client";

import { type Row, type Table as TanstackTable, flexRender } from "@tanstack/react-table";
import * as React from "react";

import { DataTablePagination } from "@/components/ui/new-table/data-table-pagination";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getNewTablePinningStyles } from "@/components/ui/new-table/new-table-utils";
import { cn } from "@/lib/utils";

function makeBodyResizeHandler(table: TanstackTable<any>, columnId: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startSize = table.getColumn(columnId)?.getSize() ?? 150;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      table.setColumnSizing((prev) => ({ ...prev, [columnId]: startSize + delta }));
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };
}

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  showPagination?: boolean;
  emptyMessage?: string;
  renderExpandedRow?: (row: Row<TData>) => React.ReactNode;
  onRowClick?: (row: Row<TData>) => void;
}

const INTERACTIVE_SELECTOR = 'button,a,input,select,textarea,[role="combobox"],[role="option"],[role="menuitem"],[data-no-row-click]';

export function DataTable<TData>({
  table,
  actionBar,
  children,
  showPagination = true,
  emptyMessage = "No results.",
  className,
  renderExpandedRow,
  onRowClick,
}: DataTableProps<TData>) {
  return (
    <div className={cn("flex flex-1 flex-col space-y-4", className)}>
      {children}

      <div className="relative flex flex-1">
        <div className="absolute inset-0 flex overflow-hidden rounded-lg border">
          <ScrollArea className="h-full w-full">
            <div className="relative w-full">
              <table
                className="w-full caption-bottom text-sm"
                style={{
                  minWidth: "100%",
                  width: table.getTotalSize(),
                  borderCollapse: "separate",
                  borderSpacing: 0,
                }}
              >
                <TableHeader className="sticky top-0 z-10 bg-background">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header, index, headers) => {
                        const next = headers[index + 1];
                        const isLastBeforeRightPinned =
                          !header.column.getIsPinned() &&
                          next?.column.getIsPinned() === "right" &&
                          next.column.getIsFirstColumn("right");
                        const pinningStyles = getNewTablePinningStyles({
                          column: header.column,
                          isHeader: true,
                          isLastBeforeRightPinned,
                        });
                        return (
                          <TableHead key={header.id} colSpan={header.colSpan} style={pinningStyles}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanResize() && (
                              <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none"
                              />
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    <>
                    {table.getRowModel().rows.map((row) => (
                      <React.Fragment key={row.id}>
                        <TableRow
                          data-state={row.getIsSelected() && "selected"}
                          onClick={onRowClick ? (e) => { if (!(e.target as Element).closest(INTERACTIVE_SELECTOR)) onRowClick(row); } : undefined}
                          className={onRowClick ? "cursor-pointer" : undefined}
                        >
                          {row.getVisibleCells().map((cell, index, cells) => {
                            const next = cells[index + 1];
                            const isLastBeforeRightPinned =
                              !cell.column.getIsPinned() &&
                              next?.column.getIsPinned() === "right" &&
                              next.column.getIsFirstColumn("right");
                            const pinningStyles = getNewTablePinningStyles({
                              column: cell.column,
                              isLastBeforeRightPinned,
                            });
                            return (
                              <TableCell
                                key={cell.id}
                                style={pinningStyles}
                                className="break-words whitespace-normal overflow-hidden"
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                {cell.column.getCanResize() && (
                                  <div
                                    onMouseDown={makeBodyResizeHandler(table, cell.column.id)}
                                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none"
                                  />
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        {row.getIsExpanded() && renderExpandedRow && (
                          <TableRow>
                            <TableCell colSpan={table.getAllColumns().length} className="p-0 bg-muted/20 border-b border-border">
                              {renderExpandedRow(row)}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                    {(() => {
                      const visibleCols = table.getVisibleLeafColumns();
                      const totalColIds = new Set(
                        visibleCols.filter((col) => col.columnDef.meta?.showTotal).map((col) => col.id)
                      );
                      if (totalColIds.size === 0) return null;
                      const filteredRows = table.getFilteredRowModel().rows;
                      const totals: Record<string, number> = {};
                      for (const colId of totalColIds) {
                        totals[colId] = filteredRows.reduce((sum, row) => {
                          const val = row.getValue(colId);
                          return sum + (typeof val === "number" ? val : 0);
                        }, 0);
                      }
                      return (
                        <TableRow className="border-t-2">
                          {visibleCols.map((col, index, cols) => {
                            const next = cols[index + 1];
                            const isLastBeforeRightPinned =
                              !col.getIsPinned() &&
                              next?.getIsPinned() === "right" &&
                              next?.getIsFirstColumn("right");
                            const isTotal = totalColIds.has(col.id);
                            const pinningStyles = getNewTablePinningStyles({ column: col, isLastBeforeRightPinned, isHeader: true });
                            return (
                              <TableCell
                                key={col.id}
                                style={pinningStyles}
                                className="break-words whitespace-normal overflow-hidden"
                              >
                                {index === 0 ? (
                                  <span className="text-xs font-semibold text-muted-foreground">Total</span>
                                ) : isTotal ? (
                                  <div className="font-mono text-xs font-semibold text-right">{(totals[col.id] ?? 0).toFixed(2)}</div>
                                ) : null}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })()}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={table.getAllColumns().length}
                        className="h-24 text-center pointer-events-none"
                      >
                        {emptyMessage}
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
        {showPagination && <DataTablePagination table={table} />}
        {actionBar && table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
      </div>
    </div>
  );
}

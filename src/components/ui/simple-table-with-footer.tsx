import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SimpleTableWithFooterProps<T = any> {
  data: T[];
  columns: ColumnDef<T>[];
  footerData?: Record<string, React.ReactNode>;
  className?: string;
}

export function SimpleTableWithFooter<T = any>({
  data,
  columns,
  footerData,
  className,
}: SimpleTableWithFooterProps<T>) {
  // Check if any column has nested columns (grouped headers)
  const hasGroupedColumns = columns.some((col: any) => col.columns?.length > 0);

  // Get cell value from column definition
  const getCellValue = (row: T, column: ColumnDef<T>, rowIndex: number) => {
    if ((column as any).cell) {
      return (column as any).cell({
        row: { original: row, index: rowIndex },
        cell: {
          getValue: () =>
            (column as any).accessorKey
              ? (row as any)[(column as any).accessorKey]
              : null,
        },
      });
    }
    if ((column as any).accessorKey) {
      return (row as any)[(column as any).accessorKey];
    }
    return null;
  };

  // Flatten columns for table structure
  const flatColumns: ColumnDef<T>[] = [];
  columns.forEach((col: any) => {
    if (col.columns?.length > 0) {
      flatColumns.push(...col.columns);
    } else {
      flatColumns.push(col);
    }
  });

  return (
    <div className={`flex flex-col flex-1 min-h-0 ${className}`}>
      <div className="border rounded-md overflow-hidden flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              {/* Main header row */}
              <TableRow>
                {columns.map((column: any) => (
                  <TableHead
                    key={column.id}
                    colSpan={column.columns?.length || 1}
                    rowSpan={
                      hasGroupedColumns &&
                      (!column.columns || column.columns.length === 0)
                        ? 2
                        : 1
                    }
                    className="font-semibold border-r border-border last:border-r-0"
                    style={{
                      width: column.size ? `${column.size}px` : undefined,
                    }}
                  >
                    {typeof column.header === "function"
                      ? column.header()
                      : column.header}
                  </TableHead>
                ))}
              </TableRow>

              {/* Sub-header row (if grouped columns exist) */}
              {hasGroupedColumns && (
                <TableRow>
                  {columns.map((column: any) =>
                    column.columns?.length > 0
                      ? column.columns.map((subColumn: any) => (
                          <TableHead
                            key={subColumn.id}
                            className="font-medium border-r border-border"
                            style={{
                              width: subColumn.size
                                ? `${subColumn.size}px`
                                : undefined,
                            }}
                          >
                            {typeof subColumn.header === "function"
                              ? subColumn.header()
                              : subColumn.header}
                          </TableHead>
                        ))
                      : null
                  )}
                </TableRow>
              )}
            </TableHeader>

            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={flatColumns.length}
                    className="text-center py-16 text-muted-foreground"
                  >
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="border-b border-border">
                    {flatColumns.map((column: any) => (
                      <TableCell
                        key={column.id}
                        className="border-r border-border last:border-r-0 p-2"
                        style={{
                          width: column.size ? `${column.size}px` : undefined,
                        }}
                      >
                        {getCellValue(row, column, rowIndex) ?? "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>

            {/* Footer with totals */}
            {footerData && data.length > 0 && (
              <TableFooter className="sticky bottom-0 bg-primary/30 border-t">
                <TableRow>
                  {flatColumns.map((column: any) => (
                    <TableCell
                      key={column.id}
                      className="border-r border-border last:border-r-0 p-2 font-medium"
                      style={{
                        width: column.size ? `${column.size}px` : undefined,
                      }}
                    >
                      {footerData[column.id] ?? ""}
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>
    </div>
  );
}

export default SimpleTableWithFooter;

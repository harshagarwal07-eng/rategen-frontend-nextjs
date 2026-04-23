import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SimpleTableProps<T = any> {
  data: T[];
  columns: ColumnDef<T>[];
  className?: string;
}

export function SimpleTable<T = any>({
  data,
  columns,
  className,
}: SimpleTableProps<T>) {
  // Check if any column has nested columns (grouped headers)
  const hasGroupedColumns = columns.some((col: any) => col.columns?.length > 0);

  // Get cell value from column definition
  const getCellValue = (row: T, column: ColumnDef<T>) => {
    if ((column as any).cell) {
      return (column as any).cell({
        row: { original: row },
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
    <div className={className}>
      <Table>
        <TableHeader>
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
                style={{ width: column.size ? `${column.size}px` : undefined }}
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
                className="text-center py-8 text-muted-foreground"
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
                  >
                    {getCellValue(row, column) ?? "-"}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default SimpleTable;

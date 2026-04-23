"use client";

import { useState, ReactNode, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../table";
import { cn } from "@/lib/utils";
import { Skeleton } from "../skeleton";
import Show from "../show";

// Nested column type for grouped headers and leaf columns
export type NestedColumn<T> = {
  key?: keyof T; // Only leaf columns have key
  label: string;
  editable?: boolean;
  render?: (value: any, row: T, rowIndex: number) => ReactNode;
  children?: NestedColumn<T>[]; // For grouped headers
};

interface ExtendedTableProps<T> {
  title: string;
  columns: NestedColumn<T>[];
  data: T[];
  filters?: ReactNode;
  onEditComplete?: (data: T[]) => void;
  onRowEdit?: (row: T, rowIndex: number) => void;
  renderActions?: (
    row: T,
    rowIndex: number,
    isEditing: boolean,
    onSave: () => void,
    onCancel: () => void
  ) => ReactNode;
  editableRows?: boolean;
  className?: string;
  isLoading?: boolean;
}

// Helper to get the max depth of the columns tree
function getHeaderDepth<T>(columns: NestedColumn<T>[]): number {
  return columns.reduce((max, col) => {
    if (col.children) {
      return Math.max(max, 1 + getHeaderDepth(col.children));
    }
    return Math.max(max, 1);
  }, 0);
}

// Helper to extract all leaf columns (for data rendering)
function getLeafColumns<T>(columns: NestedColumn<T>[]): NestedColumn<T>[] {
  return columns.flatMap((col) =>
    col.children ? getLeafColumns(col.children) : [col]
  );
}

// Helper to build header rows for grouped headers
function buildHeaderRows<T>(
  columns: NestedColumn<T>[],
  depth: number,
  currentLevel = 0,
  rows: ReactNode[][] = []
): ReactNode[][] {
  if (!rows[currentLevel]) rows[currentLevel] = [];
  columns.forEach((col) => {
    const hasChildren = !!col.children && col.children.length > 0;
    const colSpan = hasChildren ? getLeafColumns(col.children!).length : 1;
    const rowSpan = hasChildren ? 1 : depth - currentLevel;
    rows[currentLevel].push(
      <TableHead
        key={col.key as string}
        colSpan={colSpan}
        rowSpan={rowSpan}
        className={hasChildren ? "text-center" : ""}
      >
        {col.label}
      </TableHead>
    );
    if (hasChildren) {
      buildHeaderRows(col.children!, depth, currentLevel + 1, rows);
    }
  });
  return rows;
}

export function ExtendedTable<T extends Record<string, any>>({
  title,
  columns,
  data,
  filters,
  onEditComplete,
  onRowEdit,
  renderActions,
  editableRows = false,
  className,
  isLoading,
}: ExtendedTableProps<T>) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<T | null>(null);
  const [tableData, setTableData] = useState<T[]>(data);

  useEffect(() => {
    setTableData(data);
  }, [data]);

  const leafColumns = getLeafColumns(columns);
  const headerDepth = getHeaderDepth(columns);
  const headerRows = buildHeaderRows(columns, headerDepth);

  const handleEdit = (row: T, rowIndex: number) => {
    setEditIndex(rowIndex);
    setEditData({ ...row });
    onRowEdit?.(row, rowIndex);
  };

  const handleEditChange = (key: keyof T, value: any) => {
    if (editData) setEditData({ ...editData, [key]: value });
  };

  const handleSave = () => {
    if (editIndex !== null && editData) {
      const updated = [...tableData];
      updated[editIndex] = editData;
      setTableData(updated);
      setEditIndex(null);
      setEditData(null);
      onEditComplete?.(updated);
    }
  };

  const handleCancel = () => {
    setEditIndex(null);
    setEditData(null);
  };

  return (
    <div className={cn("w-full rounded-lg border-2", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b-2 bg-card rounded-t-lg">
        <h5>{title}</h5>
        <div>{filters}</div>
      </div>
      <Table className="bg-primary/5">
        <TableHeader className="bg-primary/10">
          {headerRows.map((row, i) => (
            <TableRow key={i}>
              {row}
              {editableRows && i === 0 && (
                <TableHead rowSpan={headerRows.length}>Actions</TableHead>
              )}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          <Show when={!!isLoading}>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRowSkeleton
                key={index}
                columns={leafColumns.length + (editableRows ? 1 : 0)}
              />
            ))}
          </Show>

          <Show when={!isLoading}>
            {tableData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {leafColumns.map((col, colIndex) => (
                  <TableCell key={col.key ? String(col.key) : colIndex}>
                    {editIndex === rowIndex && col.editable && col.key ? (
                      <input
                        className="border rounded px-2 py-1 w-full bg-background"
                        value={editData?.[col.key] ?? ""}
                        onChange={(e) =>
                          handleEditChange(col.key!, e.target.value)
                        }
                      />
                    ) : col.render && col.key ? (
                      col.render(row[col.key], row, rowIndex)
                    ) : col.key ? (
                      row[col.key]
                    ) : null}
                  </TableCell>
                ))}
                {editableRows && (
                  <TableCell>
                    {renderActions ? (
                      renderActions(
                        row,
                        rowIndex,
                        editIndex === rowIndex,
                        handleSave,
                        handleCancel
                      )
                    ) : editIndex === rowIndex ? (
                      <>
                        <button
                          className="btn btn-sm btn-primary mr-2"
                          onClick={handleSave}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleEdit(row, rowIndex)}
                      >
                        Edit
                      </button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </Show>

          <Show when={!isLoading && tableData.length === 0}>
            <TableRow>
              <TableCell
                colSpan={leafColumns.length + (editableRows ? 1 : 0)}
                className="h-96"
              >
                <p className="text-center text-sm text-muted-foreground">
                  No data found
                </p>
              </TableCell>
            </TableRow>
          </Show>
        </TableBody>
      </Table>
    </div>
  );
}

const TableCellSkeleton = () => <Skeleton className="h-6 w-full" />;

const TableRowSkeleton = ({ columns }: { columns: number }) => (
  <TableRow>
    {Array.from({ length: columns }).map((_, index) => (
      <TableCell key={index}>
        <TableCellSkeleton />
      </TableCell>
    ))}
  </TableRow>
);

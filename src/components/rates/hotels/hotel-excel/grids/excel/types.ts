// Types for Excel-like Grid
import { IOption } from "@/types/common";

export type CellType = "text" | "number" | "select" | "expandable" | "checkbox" | "daterange";

// Select options can be:
// - string[] for simple options where value === label
// - IOption[] for options with separate value/label
// - Function returning either format (for dynamic options per row)
export type SelectOptions<T> = string[] | IOption[] | ((row: T) => string[] | IOption[]);

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey: keyof T;
  width?: number;
  minWidth?: number;
  editable?: boolean;
  type?: CellType;
  options?: SelectOptions<T>; // For select type - supports string[] or IOption[]
  filterable?: boolean; // If true, shows filter icon in header
}

export interface CellPosition {
  row: number;
  col: number;
}

export interface SelectionRange {
  start: CellPosition;
  end: CellPosition;
}

export interface SelectionBounds {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export interface CellChangeEvent<T> {
  rowId: string;
  field: keyof T;
  value: any;
}

export interface ExcelGridProps<T extends { id: string }> {
  data: T[];
  columns: ColumnDef<T>[];
  onCellChange: (rowId: string, field: keyof T, value: any) => void;
  getRowId?: (row: T) => string;
}

// Helper to get selection bounds from range
export function getSelectionBounds(range: SelectionRange | null): SelectionBounds | null {
  if (!range) return null;

  return {
    minRow: Math.min(range.start.row, range.end.row),
    maxRow: Math.max(range.start.row, range.end.row),
    minCol: Math.min(range.start.col, range.end.col),
    maxCol: Math.max(range.start.col, range.end.col),
  };
}

// Check if a cell is within bounds
export function isCellInBounds(pos: CellPosition, bounds: SelectionBounds): boolean {
  return (
    pos.row >= bounds.minRow &&
    pos.row <= bounds.maxRow &&
    pos.col >= bounds.minCol &&
    pos.col <= bounds.maxCol
  );
}

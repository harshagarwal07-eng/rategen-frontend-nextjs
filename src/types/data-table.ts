import type { DataTableConfig } from "@/config/data-table";
import type { FilterItemSchema } from "@/lib/parsers";
import type { Row, RowData } from "@tanstack/react-table";
import { Column } from "@tanstack/react-table";
import { LucideIcon } from "lucide-react";

declare module "@tanstack/react-table" {
  // biome-ignore lint/correctness/noUnusedVariables: Interface type parameters required by @tanstack/react-table
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
    placeholder?: string;
    variant?: FilterVariant;
    options?: Option[];
    range?: [number, number];
    unit?: string;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    onSearch?: (query: string) => Promise<Option[]>;
  }
}

export type Option = {
  label: string;
  value: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ColumnMeta<TData, TValue = unknown> = {
  label?: string;
  placeholder?: string;
  variant?:
    | "text"
    | "number"
    | "boolean"
    | "select"
    | "multiSelect"
    | "multiSelectSearch"
    | "range"
    | "date"
    | "dateRange";
  icon?: LucideIcon;
  unit?: string;
  options?: Option[];
  onSearch?: (query: string) => Promise<Option[]>;
};

export type ExtendedColumnDef<TData, TValue = unknown> = {
  meta?: ColumnMeta<TData, TValue>;
  enableColumnFilter?: boolean;
  enablePinning?: boolean;
};

export type ExtendedColumnSort<TData> = {
  id: string;
  desc: boolean;
  column: Column<TData, unknown>;
};

export interface ExtendedColumnFilter<TData> extends FilterItemSchema {
  id: Extract<keyof TData, string>;
}

export interface DataTableRowAction<TData> {
  row: Row<TData>;
  variant: "update" | "delete";
}

export type FilterOperator = DataTableConfig["operators"][number];
export type FilterVariant = DataTableConfig["filterVariants"][number];
export type JoinOperator = DataTableConfig["joinOperators"][number];

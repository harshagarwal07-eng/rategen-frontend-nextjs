"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Table } from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import { useDebounce } from "@/hooks/use-debounce";

interface DataTableGlobalSearchProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  searchableColumns?: string[];
  placeholder?: string;
}

export function DataTableGlobalSearch<TData>({
  table,
  searchableColumns = [],
  placeholder = "Search...",
  className,
}: DataTableGlobalSearchProps<TData>) {
  const [search, setSearch] = useQueryState("search", {
    defaultValue: "",
    shallow: false,
  });
  const [localValue, setLocalValue] = React.useState(search);
  const debouncedValue = useDebounce(localValue, 300);

  React.useEffect(() => {
    setLocalValue(search);
  }, [search]);

  React.useEffect(() => {
    setSearch(debouncedValue || null);
  }, [debouncedValue, setSearch]);

  React.useEffect(() => {
    if (searchableColumns.length > 0) {
      for (const colId of searchableColumns) {
        table.getColumn(colId)?.setFilterValue(debouncedValue || undefined);
      }
    } else {
      table.setGlobalFilter(debouncedValue || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue, table]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        className="h-7 w-64 lg:w-70 pr-6 border border-dashed focus-visible:border-ring focus-visible:ring-[2px] text-xs placeholder:text-xs"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
        <SearchIcon className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Filter, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { IOption } from "@/types/common";

interface ColumnFilterProps<T> {
  columnId: string;
  data: T[];
  accessorKey: keyof T;
  activeFilters: Set<string>;
  onFilterChange: (columnId: string, values: Set<string>) => void;
  // Optional: for select columns, pass options to display labels instead of raw values
  options?: IOption[] | ((row: T) => IOption[]);
}

export function ColumnFilter<T>({
  columnId,
  data,
  accessorKey,
  activeFilters,
  onFilterChange,
  options,
}: ColumnFilterProps<T>) {
  const [open, setOpen] = useState(false);

  // Build a map of value -> label from options (for select columns)
  const labelMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!options) return map;

    // Collect all options from all rows (for dynamic options)
    if (typeof options === "function") {
      data.forEach((row) => {
        const rowOptions = options(row);
        rowOptions.forEach((opt) => map.set(opt.value, opt.label));
      });
    } else {
      options.forEach((opt) => map.set(opt.value, opt.label));
    }
    return map;
  }, [options, data]);

  // Get unique values from the data for this column
  const uniqueValues = useMemo(() => {
    const values = new Set<string>();
    data.forEach((row) => {
      const value = row[accessorKey];
      if (value != null && value !== "") {
        values.add(String(value));
      }
    });
    // Sort by label if we have a labelMap, otherwise by value
    return Array.from(values).sort((a, b) => {
      const labelA = labelMap.get(a) || a;
      const labelB = labelMap.get(b) || b;
      return labelA.localeCompare(labelB);
    });
  }, [data, accessorKey, labelMap]);

  // Helper to get display label for a value
  const getLabel = (value: string): string => {
    return labelMap.get(value) || value;
  };

  const hasActiveFilters = activeFilters.size > 0;

  const toggleValue = (value: string) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(value)) {
      newFilters.delete(value);
    } else {
      newFilters.add(value);
    }
    onFilterChange(columnId, newFilters);
  };

  const selectAll = () => {
    onFilterChange(columnId, new Set(uniqueValues));
  };

  const clearAll = () => {
    onFilterChange(columnId, new Set());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center p-0.5 rounded hover:bg-accent",
            hasActiveFilters && "text-primary"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Filter className={cn("h-3 w-3", hasActiveFilters && "fill-primary/20")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-medium">Filter</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={selectAll}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={clearAll}
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
          {uniqueValues.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No values
            </div>
          ) : (
            uniqueValues.map((value) => {
              const isSelected = activeFilters.has(value);
              return (
                <button
                  key={value}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs hover:bg-accent",
                    isSelected && "bg-accent/50"
                  )}
                  onClick={() => toggleValue(value)}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-4 h-4 border rounded",
                      isSelected && "bg-primary border-primary"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="truncate">{getLabel(value) || "(empty)"}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

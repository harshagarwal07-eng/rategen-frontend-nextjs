"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface FDMonthPickerProps {
  selected: string[];
  onChange: (months: string[]) => void;
  className?: string;
  monthsAhead?: number;
}

interface MonthEntry {
  key: string;
  label: string;
  year: number;
}

function buildMonths(monthsAhead: number): MonthEntry[] {
  const result: MonthEntry[] = [];
  const now = new Date();
  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short" });
    result.push({ key, label, year });
  }
  return result;
}

export function FDMonthPicker({
  selected,
  onChange,
  className,
  monthsAhead = 24,
}: FDMonthPickerProps) {
  const [open, setOpen] = useState(false);

  const months = useMemo(() => buildMonths(monthsAhead), [monthsAhead]);

  const grouped = useMemo(() => {
    const map: Record<number, MonthEntry[]> = {};
    for (const m of months) {
      if (!map[m.year]) map[m.year] = [];
      map[m.year].push(m);
    }
    return map;
  }, [months]);

  const toggle = (key: string) => {
    if (selected.includes(key)) onChange(selected.filter((k) => k !== key));
    else onChange([...selected, key]);
  };

  const display = useMemo(() => {
    if (selected.length === 0) return "When?";
    const sortedSelected = [...selected].sort();
    const firstKey = sortedSelected[0];
    const firstEntry = months.find((m) => m.key === firstKey);
    const firstLabel = firstEntry ? `${firstEntry.label} ${firstEntry.year}` : firstKey;
    if (selected.length === 1) return firstLabel;
    return `${firstLabel} +${selected.length - 1} more`;
  }, [selected, months]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors text-left w-full",
            className,
          )}
        >
          <Calendar className="size-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Travel Month
            </div>
            <div
              className={cn(
                "text-sm font-medium truncate",
                selected.length === 0 && "text-muted-foreground font-normal",
              )}
            >
              {display}
            </div>
          </div>
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <ScrollArea className="h-80">
          <div className="p-3 space-y-4">
            {Object.keys(grouped)
              .sort()
              .map((yearStr) => {
                const year = Number(yearStr);
                const items = grouped[year];
                return (
                  <div key={year}>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">{year}</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {items.map((m) => {
                        const isSelected = selected.includes(m.key);
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => toggle(m.key)}
                            className={cn(
                              "px-2 py-1.5 text-xs rounded-md border transition-colors",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "hover:bg-muted border-border",
                            )}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </ScrollArea>
        {selected.length > 0 && (
          <div className="p-2 border-t flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
            <Button variant="ghost" size="sm" onClick={() => onChange([])}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

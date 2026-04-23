"use client";

import * as React from "react";
import {
  format,
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  startOfYear, endOfYear,
  subDays, subWeeks, subMonths, subQuarters, subYears,
} from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DATE_FMT = "yyyy-MM-dd";
const DISPLAY_FMT = "d MMM yyyy";

export const DATE_RANGE_SHORTCUTS: { label: string; getRange: () => DateRange }[] = [
  { label: "Today",        getRange: () => { const d = new Date(); return { from: startOfDay(d), to: endOfDay(d) }; } },
  { label: "Yesterday",    getRange: () => { const d = subDays(new Date(), 1); return { from: startOfDay(d), to: endOfDay(d) }; } },
  { label: "This Week",    getRange: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: "Last Week",    getRange: () => { const w = subWeeks(new Date(), 1); return { from: startOfWeek(w, { weekStartsOn: 1 }), to: endOfWeek(w, { weekStartsOn: 1 }) }; } },
  { label: "This Month",   getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Last Month",   getRange: () => { const m = subMonths(new Date(), 1); return { from: startOfMonth(m), to: endOfMonth(m) }; } },
  { label: "This Quarter", getRange: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
  { label: "Last Quarter", getRange: () => { const q = subQuarters(new Date(), 1); return { from: startOfQuarter(q), to: endOfQuarter(q) }; } },
  { label: "This Year",    getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
  { label: "Last Year",    getRange: () => { const y = subYears(new Date(), 1); return { from: startOfYear(y), to: endOfYear(y) }; } },
];

export interface DateRangeValue {
  from?: string | null;
  to?: string | null;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (from: string | null, to: string | null) => void;
  label?: string;
  align?: "start" | "end";
  className?: string;
}

export function DateRangePicker({ value, onChange, label = "Date Range", align = "start", className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsedRange = React.useMemo<DateRange | undefined>(() => {
    const from = value.from ? new Date(value.from) : undefined;
    const to   = value.to   ? new Date(value.to)   : undefined;
    return from ? { from, to } : undefined;
  }, [value.from, value.to]);

  const [pending, setPending] = React.useState<DateRange | undefined>(parsedRange);

  // Sync pending when popover opens
  const handleOpenChange = (next: boolean) => {
    if (next) setPending(parsedRange);
    setOpen(next);
  };

  const apply = (range: DateRange | undefined) => {
    onChange(
      range?.from ? format(range.from, DATE_FMT) : null,
      range?.to   ? format(range.to,   DATE_FMT) : null,
    );
    setOpen(false);
  };

  const hasValue = !!(value.from || value.to);

  const displayLabel = React.useMemo(() => {
    if (!value.from && !value.to) return label;
    const from = value.from ? format(new Date(value.from), DISPLAY_FMT) : "…";
    const to   = value.to   ? format(new Date(value.to),   DISPLAY_FMT) : "…";
    return `${from} – ${to}`;
  }, [value.from, value.to, label]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 text-xs border-dashed gap-1.5 pr-2",
            hasValue && "border-primary/60 bg-primary/10 text-primary",
            className
          )}
        >
          <CalendarIcon className="size-3.5 shrink-0" />
          <span>{displayLabel}</span>
          {hasValue && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); apply(undefined); }}
              className="ml-0.5 rounded hover:bg-primary/20 p-0.5"
            >
              <X className="size-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 flex" align={align} side="bottom">
        {/* Shortcuts */}
        <div className="flex flex-col gap-0.5 border-r p-2 min-w-[130px]">
          {DATE_RANGE_SHORTCUTS.map((s) => (
            <Button
              key={s.label}
              variant="ghost"
              size="sm"
              className="h-7 text-xs justify-start px-2 font-normal"
              onClick={() => apply(s.getRange())}
            >
              {s.label}
            </Button>
          ))}
        </div>

        {/* Calendar */}
        <div className="flex flex-col">
          <Calendar
            mode="range"
            selected={pending}
            onSelect={setPending}
            captionLayout="dropdown"
            numberOfMonths={2}
            className="p-3"
          />
          <div className="border-t px-3 py-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!pending?.from}
              onClick={() => apply(pending)}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

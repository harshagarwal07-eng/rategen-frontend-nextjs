"use client";

// Multi-range date picker with click-click-click range commits inside a
// single popover. Replaces the per-row "+ Add Range" UX for hotel seasons.
//
// Click 1 → marks pending range start (highlighted amber).
// Click 2 → if >= pending start, commits {from: pending, to: clicked} and
//           resets pending. If < pending start, replaces pending start with
//           the new earlier click.
// Click on a date inside an already-committed range → removes that range.
//
// Multiple ranges accumulate inside the popover until the user clicks Done
// or outside. No per-range row.

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateRangeISO {
  date_from: string; // YYYY-MM-DD
  date_to: string;
}

interface Props {
  value: DateRangeISO[];
  onChange: (next: DateRangeISO[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const ISO = "yyyy-MM-dd";

const fmtIso = (d: Date) => format(d, ISO);
const parseIso = (s: string): Date => {
  // YYYY-MM-DD parsed as local date; using new Date(s) parses as UTC which
  // shifts a day backward for negative TZ offsets. Build via parts.
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dayBetween = (d: Date, from: Date, to: Date) => {
  const t = d.getTime();
  return t >= from.getTime() && t <= to.getTime();
};

const formatRangeShort = (r: DateRangeISO) =>
  `${format(parseIso(r.date_from), "d MMM")} – ${format(parseIso(r.date_to), "d MMM yyyy")}`;

const summarize = (ranges: DateRangeISO[]) => {
  if (ranges.length === 0) return "";
  if (ranges.length <= 2) return ranges.map(formatRangeShort).join(", ");
  return `${formatRangeShort(ranges[0])} +${ranges.length - 1} more`;
};

export function MultiRangeDatePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Pick date ranges",
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [pendingStart, setPendingStart] = React.useState<Date | null>(null);

  // Reset the in-progress start whenever the popover closes so reopening
  // doesn't carry over a half-finished selection.
  React.useEffect(() => {
    if (!open) setPendingStart(null);
  }, [open]);

  const committedDates = React.useMemo(
    () => value.map((r) => ({ from: parseIso(r.date_from), to: parseIso(r.date_to) })),
    [value]
  );

  const findRangeIndex = (day: Date) =>
    committedDates.findIndex((r) => dayBetween(day, r.from, r.to));

  const handleDayClick = (day: Date) => {
    // Click inside a committed range → remove that range.
    const hitIdx = findRangeIndex(day);
    if (hitIdx >= 0) {
      onChange(value.filter((_, i) => i !== hitIdx));
      setPendingStart(null);
      return;
    }

    if (!pendingStart) {
      setPendingStart(day);
      return;
    }

    if (day < pendingStart) {
      // Earlier click — treat as restart of the in-progress range.
      setPendingStart(day);
      return;
    }

    onChange([...value, { date_from: fmtIso(pendingStart), date_to: fmtIso(day) }]);
    setPendingStart(null);
  };

  const clearAll = () => {
    onChange([]);
    setPendingStart(null);
  };

  const removeRange = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const summary = summarize(value);

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full justify-start font-normal",
            !summary && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate">{summary || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex flex-col gap-3">
          <DayPicker
            numberOfMonths={2}
            onDayClick={handleDayClick}
            modifiers={{
              committed: (day) =>
                committedDates.some((r) => dayBetween(day, r.from, r.to)),
              pendingStart: (day) => !!pendingStart && sameDay(day, pendingStart),
            }}
            modifiersClassNames={{
              committed:
                "bg-primary/15 text-primary-foreground rounded-none data-[selected=true]:bg-primary/15",
              pendingStart:
                "bg-amber-500/30 text-foreground ring-1 ring-amber-500 rounded-md",
            }}
            captionLayout="dropdown"
            className="bg-background"
          />

          {value.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-w-[640px]">
              {value.map((r, i) => (
                <span
                  key={`${r.date_from}-${r.date_to}-${i}`}
                  className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs"
                >
                  {formatRangeShort(r)}
                  <button
                    type="button"
                    onClick={() => removeRange(i)}
                    className="ml-0.5 text-muted-foreground hover:text-destructive"
                    aria-label="Remove range"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {pendingStart && (
            <div className="text-[11px] text-muted-foreground">
              Pick the end date for{" "}
              <span className="text-amber-700 font-medium">
                {format(pendingStart, "d MMM yyyy")}
              </span>
              .
            </div>
          )}

          <div className="flex justify-between items-center pt-1 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={value.length === 0 && !pendingStart}
            >
              Clear all
            </Button>
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

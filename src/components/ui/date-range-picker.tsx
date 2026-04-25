// Multi-range date picker. Stores ranges as comma-separated strings.
// Used by: hotel-rooms-form, tour-packages-form, transfer-packages-form,
//          combo-season-fields, manual-{hotel,tour,transfer}-sheet, data-table-toolbar,
//          agent-ledger-sheet, supplier-ledger-sheet.
// For single date-range fields, use `date-validity-picker.tsx` instead.
"use client";

import * as React from "react";
import {
  format,
  parse,
  endOfYear,
  endOfMonth,
  addMonths,
  addYears,
  startOfMonth,
  startOfYear,
  isValid,
} from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
import { type DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateRangePreset {
  label: string;
  getRange: () => { from: Date; to: Date };
}

interface DateRangePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Override the preset shortcut list. Defaults to module-wide presets. */
  presets?: DateRangePreset[];
}

function formatDateRange(range: DateRange | undefined): string {
  if (!range?.from) return "";
  if (range.to) {
    return `${format(range.from, DATE_FORMATS[6])} - ${format(range.to, DATE_FORMATS[6])}`;
  }
  return format(range.from, DATE_FORMATS[6]);
}

// Keywords that should be treated as "today"
const TODAY_KEYWORDS = ["current", "today", "now"];

// Common date formats to try parsing
const DATE_FORMATS = [
  "LLL dd, y", // Jan 01, 2025
  "LLL dd y", // Jan 01 2025
  "MMM dd, yyyy", // Jan 01, 2025
  "MMM dd yyyy", // Jan 01 2025
  "dd LLL y", // 01 Jan 2025
  "dd LLL yy", // 01 Jan 25
  "dd MMM yyyy", // 01 Jan 2025
  "dd MMM yy", // 01 Jan 25
  "yyyy-MM-dd", // 2025-01-01
  "MM/dd/yyyy", // 01/01/2025
  "dd/MM/yyyy", // 01/01/2025
  "M/d/yy", // 1/1/25
];

function parseWithKeywords(dateStr: string): Date | null {
  const normalized = dateStr.trim().toLowerCase();

  // Check for today keywords
  if (TODAY_KEYWORDS.includes(normalized)) {
    return new Date();
  }

  // Try parsing with various formats
  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = parse(dateStr.trim(), fmt, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      // Continue to next format
    }
  }

  // Try native Date parsing as fallback
  const nativeDate = new Date(dateStr);
  if (isValid(nativeDate)) {
    return nativeDate;
  }

  return null;
}

function parseDateRangeFromString(dateStr: string): DateRange | undefined {
  if (!dateStr) return undefined;

  // Try to parse as a date range (e.g., "Jan 1 - Mar 31", "Current - Dec 31")
  const parts = dateStr.split(/\s*[-–—]\s*|\s+to\s+/i);

  if (parts.length >= 2) {
    const fromResult = parseWithKeywords(parts[0].trim());
    const toResult = parseWithKeywords(parts[1].trim());

    if (fromResult && toResult) {
      return { from: fromResult, to: toResult };
    }
    if (fromResult) {
      return { from: fromResult, to: undefined };
    }
    if (toResult) {
      return { from: toResult, to: undefined };
    }
  }

  // Try single date
  const singleDate = parseWithKeywords(dateStr);
  if (singleDate) {
    return { from: singleDate, to: undefined };
  }

  return undefined;
}

// Parse comma-separated ranges from stored value
function parseMultipleRanges(value: string): string[] {
  if (!value) return [];
  // Split by comma, but be careful with dates that have commas in format "LLL dd, y"
  // Pattern: "Jan 01, 2025 - Mar 31, 2025" - we split on ", " followed by a letter (start of next month)
  return value
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
}

// Preset date ranges
const DATE_PRESETS = [
  {
    label: "Current - Year End",
    getRange: () => ({ from: new Date(), to: endOfYear(new Date()) }),
  },
  {
    label: "Current - Month End",
    getRange: () => ({ from: new Date(), to: endOfMonth(new Date()) }),
  },
  {
    label: "Next 3 Months",
    getRange: () => ({
      from: new Date(),
      to: endOfMonth(addMonths(new Date(), 2)),
    }),
  },
  {
    label: "Next 6 Months",
    getRange: () => ({
      from: new Date(),
      to: endOfMonth(addMonths(new Date(), 5)),
    }),
  },
  {
    label: "Full Year",
    getRange: () => {
      const now = new Date();
      return { from: startOfMonth(now), to: endOfYear(now) };
    },
  },
  {
    label: "All Season",
    getRange: () => {
      const now = new Date();
      return { from: startOfYear(now), to: endOfYear(addYears(now, 5)) };
    },
  },
];

export function DateRangePicker({
  value,
  onChange,
  placeholder = "e.g., Jan 1 - Mar 31",
  disabled = false,
  className,
  presets,
}: DateRangePickerProps) {
  const activePresets = presets ?? DATE_PRESETS;
  const [inputValue, setInputValue] = React.useState("");
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);
  const [month, setMonth] = React.useState<Date | undefined>(new Date());
  const [open, setOpen] = React.useState(false);

  // Parse existing ranges from value
  const ranges = React.useMemo(() => parseMultipleRanges(value || ""), [value]);

  const addRange = React.useCallback(
    (newRange: string | DateRange) => {
      let formatted: string;
      if (typeof newRange === "string") {
        const parsed = parseDateRangeFromString(newRange);
        if (!parsed) return;
        formatted = formatDateRange(parsed);
      } else {
        formatted = formatDateRange(newRange);
      }
      if (!formatted) return;

      const newRanges = [...ranges, formatted];
      onChange(newRanges.join(", "));
      setInputValue("");
      setDate(undefined);
      setOpen(false);
    },
    [ranges, onChange]
  );

  const removeRange = React.useCallback(
    (index: number) => {
      const newRanges = ranges.filter((_, i) => i !== index);
      onChange(newRanges.join(", "));
    },
    [ranges, onChange]
  );

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    []
  );

  const handleInputBlur = React.useCallback(() => {
    const parsed = parseDateRangeFromString(inputValue);
    if (parsed) {
      setDate(parsed);
      if (parsed.from) {
        setMonth(parsed.from);
      }
    }
  }, [inputValue]);

  const handleInputKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addRange(inputValue);
      }
    },
    [inputValue, addRange]
  );

  const handleCalendarSelect = React.useCallback(
    (range: DateRange | undefined) => {
      setDate(range);
      if (range) {
        const formatted = formatDateRange(range);
        setInputValue(formatted);
      }
    },
    []
  );

  const handleAddClick = React.useCallback(() => {
    if (date?.from) {
      addRange(date);
    } else if (inputValue) {
      addRange(inputValue);
    }
  }, [inputValue, date, addRange]);

  const handlePresetClick = React.useCallback(
    (preset: DateRangePreset) => {
      const range = preset.getRange();
      addRange(range);
    },
    [addRange]
  );

  const canAdd = !!(date?.from && date?.to) || !!inputValue;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Existing ranges as badges */}
      {ranges.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ranges.map((range, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs font-normal py-1 px-2 gap-1"
            >
              {range}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeRange(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Input row */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex gap-1 cursor-pointer">
            <Input
              value={inputValue}
              placeholder={placeholder}
              disabled={disabled}
              className="bg-background pr-8 h-8 text-sm flex-1 cursor-pointer"
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              readOnly={false}
            />
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              className="absolute top-1/2 right-1 size-6 -translate-y-1/2 pointer-events-none"
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Select date range</span>
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="end">
          <Calendar
            mode="range"
            selected={date}
            captionLayout="dropdown"
            month={month}
            onMonthChange={setMonth}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
          />
          {/* Presets */}
          <div className="flex flex-wrap gap-1.5 border-t px-3 py-3 max-w-md">
            {activePresets.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          {/* Add button */}
          <div className="border-t px-3 py-2">
            <Button
              type="button"
              size="sm"
              disabled={!canAdd}
              className="w-full"
              onClick={handleAddClick}
            >
              <Plus className="size-4 mr-1" />
              Add Dates
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

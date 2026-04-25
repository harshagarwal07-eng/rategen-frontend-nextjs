// Single date-range picker with FY/CY presets and year-month dropdown nav.
// Returns {from, to} Date objects. Used by contract validity fields.
// For multi-range season editors, use `date-range-picker.tsx` instead.
"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type DateRangeValue = { from?: Date; to?: Date } | undefined;

interface DateValidityPickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function getFYBounds(offset: 0 | 1): { from: Date; to: Date } {
  const now = new Date();
  const fyStartYear = (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) + offset;
  return {
    from: new Date(fyStartYear, 3, 1),
    to: new Date(fyStartYear + 1, 2, 31),
  };
}

function buildPresets() {
  const cy = new Date().getFullYear();
  return [
    { label: "Current CY", from: new Date(cy, 0, 1), to: new Date(cy, 11, 31) },
    { label: "Next CY", from: new Date(cy + 1, 0, 1), to: new Date(cy + 1, 11, 31) },
    { label: "Current FY", ...getFYBounds(0) },
    { label: "Next FY", ...getFYBounds(1) },
  ];
}

export function DateValidityPicker({
  value,
  onChange,
  placeholder = "Select date range",
  disabled = false,
  className,
}: DateValidityPickerProps) {
  const [open, setOpen] = React.useState(false);
  const currentYear = new Date().getFullYear();
  const presets = React.useMemo(buildPresets, []);

  const displayText = React.useMemo(() => {
    if (!value?.from) return null;
    if (!value.to) return format(value.from, "MMM d, yyyy");
    return `${format(value.from, "MMM d, yyyy")} – ${format(value.to, "MMM d, yyyy")}`;
  }, [value]);

  const handleSelect = (range: DateRange | undefined) => {
    onChange(range ? { from: range.from, to: range.to } : undefined);
  };

  const applyPreset = (from: Date, to: Date) => {
    onChange({ from, to });
    setOpen(false);
  };

  const rdpValue: DateRange | undefined =
    value?.from || value?.to ? { from: value?.from, to: value?.to } : undefined;

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full pl-3 text-left font-normal h-10",
            !displayText && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {displayText ?? <span>{placeholder}</span>}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col gap-0.5 p-3 border-r w-[144px] shrink-0">
            <p className="text-xs font-medium text-muted-foreground mb-1.5 px-1">Presets</p>
            {presets.map((p) => (
              <Button
                key={p.label}
                variant="ghost"
                size="sm"
                className="justify-start font-normal text-xs h-8"
                onClick={() => applyPreset(p.from, p.to)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="p-3">
            <Calendar
              mode="range"
              selected={rdpValue}
              onSelect={handleSelect}
              numberOfMonths={2}
              captionLayout="dropdown"
              fromYear={2020}
              toYear={currentYear + 10}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

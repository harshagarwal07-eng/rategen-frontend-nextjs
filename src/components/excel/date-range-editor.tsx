"use client";

import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { X, Plus } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface DateRangeEditorProps {
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
  disabled?: boolean;
}

function formatDateRange(range: DateRange | undefined): string {
  if (!range?.from) return "";
  if (range.to) {
    return `${format(range.from, "dd MMM yy")} - ${format(range.to, "dd MMM yy")}`;
  }
  return format(range.from, "dd MMM yy");
}

// Parse comma-separated ranges from stored value
function parseMultipleRanges(value: string): string[] {
  if (!value) return [];
  // Split by comma followed by space and a date pattern (digit or letter)
  return value
    .split(/,\s*(?=\d|[A-Za-z])/)
    .map((r) => r.trim())
    .filter(Boolean);
}

export function DateRangeEditor({ value, onSave, onClose, disabled }: DateRangeEditorProps) {
  const [ranges, setRanges] = useState<string[]>(() => parseMultipleRanges(value));
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(undefined);
  const [month, setMonth] = useState<Date>(new Date());

  // Add current selection to ranges
  const handleAdd = useCallback(() => {
    if (selectedRange?.from && selectedRange?.to) {
      const formatted = formatDateRange(selectedRange);
      setRanges((prev) => [...prev, formatted]);
      setSelectedRange(undefined);
    }
  }, [selectedRange]);

  // Remove a range
  const handleRemove = useCallback((index: number) => {
    setRanges((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Save and close
  const handleSave = useCallback(() => {
    onSave(ranges.join(", "));
    onClose();
  }, [ranges, onSave, onClose]);

  // Cancel and close
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const canAdd = selectedRange?.from && selectedRange?.to;

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <Popover open modal={false}>
        <PopoverTrigger asChild>
          <div className="w-full h-full" />
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          sideOffset={-28}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onFocusOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="p-4 w-full max-w-lg">
            {/* Added ranges as badges */}
            {ranges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-2 border-b">
                {ranges.map((range, index) => (
                  <Badge key={index} variant="secondary" className="text-xs font-normal py-1 px-2 gap-1">
                    {range}
                    {!disabled && (
                      <button type="button" onClick={() => handleRemove(index)} className="ml-1 hover:text-destructive">
                        <X className="size-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}

            {/* Calendar */}
            <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
              <Calendar
                mode="range"
                selected={selectedRange}
                onSelect={setSelectedRange}
                month={month}
                onMonthChange={setMonth}
                numberOfMonths={2}
                captionLayout="dropdown"
                className="pl-2"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm text-muted-foreground">
                {selectedRange?.from && selectedRange?.to
                  ? `Selected: ${formatDateRange(selectedRange)}`
                  : selectedRange?.from
                  ? `Start: ${format(selectedRange.from, "dd MMM yy")} - Select end date`
                  : "Select a date range"}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={disabled || !canAdd}>
                <Plus className="size-4 mr-1" />
                Add
              </Button>
            </div>

            <Separator />

            <div className="flex gap-2 justify-between pt-2">
              {disabled ? (
                <Button type="button" variant="outline" size="sm" onClick={handleCancel} className="ml-auto">
                  Close
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={handleSave}>
                    Done
                  </Button>
                </>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

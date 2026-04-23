"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years";
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  minDate,
  maxDate,
  captionLayout = "label",
}: DatePickerProps) {
  const [month, setMonth] = React.useState<Date>(value ?? new Date());

  React.useEffect(() => {
    if (value) setMonth(value);
  }, [value]);

  const defaultDisabled = React.useCallback(
    (date: Date) => {
      if (disabled) return disabled(date);
      if (minDate && date < minDate) return true;
      if (maxDate && date > maxDate) return true;
      return false;
    },
    [disabled, minDate, maxDate]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full pl-3 text-left font-normal h-10", !value && "text-muted-foreground", className)}
        >
          {value ? format(value, "PPP") : <span>{placeholder}</span>}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={defaultDisabled}
          captionLayout={captionLayout}
          startMonth={minDate}
          endMonth={maxDate}
          month={month}
          onMonthChange={setMonth}
        />
      </PopoverContent>
    </Popover>
  );
}

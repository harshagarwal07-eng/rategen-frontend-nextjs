"use client";

import * as React from "react";
import { Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  value?: string;
  onChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  className,
  disabled = false,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [tempHour, setTempHour] = React.useState<string>("");
  const [tempMinute, setTempMinute] = React.useState<string>("");

  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );
  const minutes = Array.from({ length: 12 }, (_, i) =>
    (i * 5).toString().padStart(2, "0")
  );

  const [selectedHour, selectedMinute] = value?.split(":") || ["", ""];

  // Reset temp values when popover opens, default to "00"
  React.useEffect(() => {
    if (open) {
      setTempHour(selectedHour || "00");
      setTempMinute(selectedMinute || "00");
    }
  }, [open, selectedHour, selectedMinute]);

  const handleHourSelect = (hour: string) => {
    setTempHour(hour);
    const minute = tempMinute || "00";
    const time = `${hour}:${minute}`;
    onChange?.(time);
  };

  const handleMinuteSelect = (minute: string) => {
    setTempMinute(minute);
    const hour = tempHour || "00";
    const time = `${hour}:${minute}`;
    onChange?.(time);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full pl-3 text-left font-normal h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value || <span>{placeholder}</span>}
          <Clock className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0  overflow-hidden" align="start">
        <div className="flex divide-x">
          {/* Hours Column */}
          <div className="flex flex-col">
            <div className="sticky top-0 z-10 border-b px-3 py-2">
              <div className="text-xs font-semibold text-center">Hour</div>
            </div>
            <ScrollArea className="h-[240px]">
              <div
                className="flex flex-col p-2 gap-1"
                onWheel={(e) => {
                  // Allow scroll to propagate even when hovering over buttons
                  e.stopPropagation();
                }}
              >
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    variant={tempHour === hour ? "default" : "ghost"}
                    className={cn(
                      "h-9 w-16 p-0 font-mono text-sm justify-center relative touch-none",
                      tempHour === hour && "font-semibold"
                    )}
                    onClick={() => handleHourSelect(hour)}
                    onWheel={(e) => {
                      // Prevent button from blocking scroll
                      e.stopPropagation();
                    }}
                  >
                    {hour}
                    {tempHour === hour && (
                      <Check className="h-3 w-3 absolute right-1" />
                    )}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Minutes Column */}
          <div className="flex flex-col">
            <div className="sticky top-0 z-10 border-b px-3 py-2">
              <div className="text-xs font-semibold text-center">Minute</div>
            </div>
            <ScrollArea className="h-[240px]">
              <div
                className="flex flex-col p-2 gap-1"
                onWheel={(e) => {
                  // Allow scroll to propagate even when hovering over buttons
                  e.stopPropagation();
                }}
              >
                {minutes.map((minute) => (
                  <Button
                    key={minute}
                    variant={tempMinute === minute ? "default" : "ghost"}
                    className={cn(
                      "h-9 w-16 p-0 font-mono text-sm justify-center relative touch-none",
                      tempMinute === minute && "font-semibold"
                    )}
                    onClick={() => handleMinuteSelect(minute)}
                    onWheel={(e) => {
                      // Prevent button from blocking scroll
                      e.stopPropagation();
                    }}
                  >
                    {minute}
                    {tempMinute === minute && (
                      <Check className="h-3 w-3 absolute right-1" />
                    )}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

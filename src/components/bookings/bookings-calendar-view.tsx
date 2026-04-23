"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDays, startOfDay, format } from "date-fns";
import { CalendarRowGrid } from "./calendar/calendar-row-grid";
import { CalendarFilters } from "./calendar/calendar-filters";
import type { BookingWithActivity } from "@/types/ops-bookings";
import { useQueryStates } from "nuqs";
import { bookingsSearchParams } from "./bookings-searchparams";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarSkeleton } from "./calendar/calendar-skeleton";

interface BookingsCalendarViewProps {
  data: { data: BookingWithActivity[]; totalItems: number };
}

export function BookingsCalendarView({ data }: BookingsCalendarViewProps) {
  const [isPending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(bookingsSearchParams, {
    shallow: false,
    startTransition,
  });
  const { start_date, end_date } = params;

  const [search, setSearch] = useState("");

  // Initialize dates from URL or default to current week
  const startDate = start_date ? startOfDay(new Date(start_date)) : startOfDay(new Date());
  const endDate = end_date ? startOfDay(new Date(end_date)) : addDays(startDate, 6);

  // Generate 7 days from startDate
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  // Sync URL on mount if not set
  useEffect(() => {
    if (!start_date || !end_date) {
      const today = startOfDay(new Date());
      setParams({
        start_date: format(today, "yyyy-MM-dd"),
        end_date: format(addDays(today, 6), "yyyy-MM-dd"),
      });
    }
  }, [start_date, end_date, setParams]);

  const handlePrevious = () => {
    const newStart = addDays(startDate, -7);
    const newEnd = addDays(newStart, 6);
    setParams({
      start_date: format(newStart, "yyyy-MM-dd"),
      end_date: format(newEnd, "yyyy-MM-dd"),
    });
  };

  const handleNext = () => {
    const newStart = addDays(startDate, 7);
    const newEnd = addDays(newStart, 6);
    setParams({
      start_date: format(newStart, "yyyy-MM-dd"),
      end_date: format(newEnd, "yyyy-MM-dd"),
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const newStart = startOfDay(date);
    const newEnd = addDays(newStart, 6);
    setParams({
      start_date: format(newStart, "yyyy-MM-dd"),
      end_date: format(newEnd, "yyyy-MM-dd"),
    });
  };

  // Check if a date is in the current range
  const isInRange = (date: Date) => {
    return date >= startDate && date <= endDate;
  };

  // Check if date is start or end of range
  const isRangeStart = (date: Date) => date.getTime() === startDate.getTime();
  const isRangeEnd = (date: Date) => date.getTime() === endDate.getTime();

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-0 rounded-md border border-primary/30 bg-primary/5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={isPending}
            className="h-8 w-8 p-0 rounded-r-none border-r border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-none px-6 gap-2 font-medium text-primary hover:text-primary hover:bg-primary/10 min-w-[220px] justify-center"
                disabled={isPending}
              >
                <CalendarIcon className="size-3.5" />
                {format(startDate, "dd MMM ''yy")} – {format(endDate, "dd MMM ''yy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleDateSelect}
                defaultMonth={startDate}
                captionLayout="dropdown"
                modifiers={{
                  range_start: isRangeStart,
                  range_end: isRangeEnd,
                  range_middle: (date) => isInRange(date) && !isRangeStart(date) && !isRangeEnd(date),
                }}
                modifiersClassNames={{
                  range_start: "bg-primary text-primary-foreground rounded-l-md",
                  range_end: "bg-primary text-primary-foreground rounded-r-md",
                  range_middle: "bg-accent text-accent-foreground",
                }}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={isPending}
            className="h-8 w-8 p-0 rounded-l-none border-l border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <CalendarFilters startTransition={startTransition} search={search} onSearchChange={setSearch} />
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden">
        {isPending ? (
          <CalendarSkeleton />
        ) : (
          <CalendarRowGrid
            days={days}
            bookings={
              search.trim()
                ? data.data.filter((b) => {
                    const q = search.trim().toLowerCase();
                    return (
                      b.service_name?.toLowerCase().includes(q) ||
                      b.traveler_name?.toLowerCase().includes(q) ||
                      b.short_query_id?.toLowerCase().includes(q)
                    );
                  })
                : data.data
            }
          />
        )}
      </div>
    </div>
  );
}

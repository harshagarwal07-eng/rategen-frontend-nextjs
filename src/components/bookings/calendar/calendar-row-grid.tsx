"use client";

import { format, isSameDay, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { BookingWithActivity, CalendarBooking } from "@/types/ops-bookings";
import { BookingCard } from "./booking-card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { getBookingStatusConfig } from "@/lib/status-styles-config";
import { ScrollArea } from "@/components/ui/scroll-area";
import { calculateCalendarLayout } from "@/lib/booking-layout-algorithm";
import { useMemo } from "react";

interface CalendarRowGridProps {
  days: Date[];
  bookings: BookingWithActivity[];
}

export function CalendarRowGrid({ days, bookings }: CalendarRowGridProps) {
  const today = startOfDay(new Date());

  // Convert to CalendarBooking format - bookings already have id mapped from booking_id
  const calendarBookings: CalendarBooking[] = useMemo(
    () =>
      bookings.map((booking: any) => ({
        ...booking,
        start_date: booking.check_in_date || booking.tour_date || booking.pickup_date || "",
        end_date: booking.check_out_date || booking.drop_date || "",
        amount: booking.cost_price || 0,
        currency: booking.currency || "USD",
      })),
    [bookings]
  );

  // Calculate smart layout with row assignment and neighbor-aware colors
  const layout = useMemo(() => calculateCalendarLayout(calendarBookings, days), [calendarBookings, days]);

  // Calculate status counts for each day using the same occupied-dates logic as the layout algorithm
  // This ensures hotel bookings spanning multiple days are counted on every day they appear in cards
  const dayStats = days.map((day, dayIndex) => {
    const dayColumn = layout.dayColumns[dayIndex];
    const dayBookings: CalendarBooking[] = [];

    if (dayColumn) {
      dayColumn.queries.forEach((queryBookings) => {
        dayBookings.push(...queryBookings);
      });
    }

    const pendingCount = dayBookings.filter((b) => b.booking_status === "pending").length;
    const onHoldCount = dayBookings.filter((b) => b.booking_status === "on_hold").length;
    const confirmedCount = dayBookings.filter((b) => b.booking_status === "confirmed").length;

    return {
      date: day,
      isToday: isSameDay(day, today),
      pendingCount,
      onHoldCount,
      confirmedCount,
      totalCount: pendingCount + onHoldCount + confirmedCount,
    };
  });

  const hasAnyBookings = bookings.length > 0;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-card">
      {/* Day Headers Row - Sticky */}
      <div className="grid grid-cols-7 divide-x bg-muted/30 sticky top-0 z-20 shrink-0">
        {dayStats.map(({ date, isToday, pendingCount, onHoldCount, confirmedCount, totalCount }) => (
          <div
            key={date.toISOString()}
            className={cn(
              "px-3 py-1.5 border-b bg-muted/50 backdrop-blur-sm",
              isToday && "bg-primary/5 border-primary"
            )}
          >
            {/* Row 1: Day Name + Month/Year */}
            <div className="flex items-center justify-between mb-1 text-[10px] text-muted-foreground uppercase tracking-wide">
              <span>{format(date, "EEE")}</span>
              <span>
                {format(date, "MMM")} '{format(date, "yy")}
              </span>
            </div>

            {/* Row 2: Date Number + Status Counts */}
            <div className="flex items-center justify-between">
              <div className={cn("font-bold leading-none tabular-nums", isToday && "text-primary")}>
                {format(date, "d")}
              </div>

              {/* Status Counts with Hover Card */}
              <HoverCard openDelay={200}>
                <HoverCardTrigger asChild>
                  <div className="flex items-center gap-1 text-xs font-semibold cursor-help tabular-nums">
                    <span className={cn(getBookingStatusConfig("pending").color)}>{pendingCount}</span>
                    <span className="text-muted-foreground/50 ">+</span>
                    <span className={cn(getBookingStatusConfig("on_hold").color)}>{onHoldCount}</span>
                    <span className="text-muted-foreground/50 ">+</span>
                    <span className={cn(getBookingStatusConfig("confirmed").color)}>{confirmedCount}</span>
                    <span className="text-muted-foreground/50 ">=</span>
                    <span className="text-foreground">{totalCount}</span>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-48 p-3" side="bottom" align="end">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{getBookingStatusConfig("pending").label}:</span>
                      <span className={cn("font-medium", getBookingStatusConfig("pending").color)}>{pendingCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{getBookingStatusConfig("on_hold").label}:</span>
                      <span className={cn("font-medium", getBookingStatusConfig("on_hold").color)}>{onHoldCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{getBookingStatusConfig("confirmed").label}:</span>
                      <span className={cn("font-medium", getBookingStatusConfig("confirmed").color)}>
                        {confirmedCount}
                      </span>
                    </div>
                    <div className="border-t pt-1.5 mt-1.5 flex items-center justify-between">
                      <span className="font-medium text-foreground">Total:</span>
                      <span className="font-semibold text-foreground">{totalCount}</span>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Body - Scrollable */}
      <ScrollArea className="flex-1 h-0">
        {!hasAnyBookings ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">No bookings in this period</p>
          </div>
        ) : (
          <div className="relative">
            {/* Row-based layout */}
            {layout.rows.map((row) => (
              <div key={row.rowIndex} className="grid grid-cols-7 divide-x border-b bg-border min-h-[80px]">
                {layout.dayColumns.map((dayColumn) => {
                  // Find queries assigned to this row that have bookings on this day
                  const queriesOnThisDay = Array.from(row.queryAssignments.values()).filter((assignment) =>
                    assignment.occupiedDays.has(dayColumn.dayIndex)
                  );

                  return (
                    <div key={dayColumn.dayIndex} className="bg-card p-2 flex flex-col gap-1">
                      {queriesOnThisDay.map((assignment) => {
                        // Get bookings for this query on this day
                        const dayBookings = dayColumn.queries.get(assignment.queryId);
                        if (!dayBookings) return null;

                        return (
                          <div key={assignment.queryId} className="flex-1">
                            <BookingCard bookings={dayBookings} color={assignment.color} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

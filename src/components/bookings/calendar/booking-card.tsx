"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getServiceTypeConfig, getBookingStatusConfig } from "@/lib/status-styles-config";
import type { BookingWithActivity, CalendarBooking } from "@/types/ops-bookings";
import type { QueryColorConfig } from "@/lib/query-color-generator";
import { BookingDetailsSheet } from "./booking-details-sheet";

interface BookingCardProps {
  bookings: BookingWithActivity[] | CalendarBooking[];
  color?: QueryColorConfig;
}

export function BookingCard({ bookings, color }: BookingCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!bookings.length) return null;

  // Extract unique service types using Set
  const serviceTypes = Array.from(new Set(bookings.map((b: any) => b.service_type)));

  // Get service names (max 3, truncate with +N more badge)
  const serviceNames = bookings.map((b: any) => b.service_name || "Service");

  const displayNames = serviceNames.slice(0, 3);
  const remainingCount = serviceNames.length - 3;

  // Calculate status counts
  const pendingCount = bookings.filter((b) => b.booking_status === "pending").length;
  const onHoldCount = bookings.filter((b) => b.booking_status === "on_hold").length;
  const confirmedCount = bookings.filter((b) => b.booking_status === "confirmed").length;

  // Get short query ID from database (same for all bookings in the group)
  const shortQueryId = (bookings[0] as any).short_query_id || "";

  // Get traveler name (same for all bookings in the group)
  const travelerName = (bookings[0] as any).traveler_name || "Traveler";

  // Get primary service type for border color (fallback if no custom color provided)
  const primaryServiceType = serviceTypes[0] || "other";
  const primaryServiceConfig = getServiceTypeConfig(primaryServiceType);

  // Use custom color if provided, otherwise use service type color
  const cardBgColor = color?.bgColor || primaryServiceConfig.bgColor;
  const cardBorderColor = color?.borderColor || primaryServiceConfig.borderColor;

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-md border-l-4 transition-all cursor-pointer hover:shadow-md h-full flex flex-col"
        style={{
          backgroundColor: cardBgColor,
          borderLeftColor: cardBorderColor,
        }}
      >
        {/* Row 1: Query ID + Type Badges */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <Badge variant="outline" className="text-[10px] font-mono font-semibold px-1.5 py-0 h-4">
            {shortQueryId}
          </Badge>
          <div className="flex gap-1 flex-wrap">
            {serviceTypes.map((type) => {
              const config = getServiceTypeConfig(type);
              return (
                <Badge
                  key={type}
                  variant="outline"
                  className={cn("text-[10px] px-1 py-0 h-4 border-0 rounded-xs", config.bgColor, config.color)}
                >
                  {config.label}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Row 2: Service Names (max 3, each on new line) */}
        <div className="text-xs font-medium text-foreground flex-1 space-y-0.5">
          {displayNames.map((name, index) => (
            <p key={index} className="truncate text-[10px]">
              {name}
            </p>
          ))}
          {remainingCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 inline-block">
              +{remainingCount} more
            </Badge>
          )}
        </div>

        {/* Row 3: Traveler Name + Status Summary */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground truncate">{travelerName}</span>
          <div className="flex items-center gap-1 text-[10px] font-semibold tabular-nums shrink-0">
            <span className={cn(getBookingStatusConfig("pending").color)}>{pendingCount}</span>
            <span className="text-muted-foreground/50">+</span>
            <span className={cn(getBookingStatusConfig("on_hold").color)}>{onHoldCount}</span>
            <span className="text-muted-foreground/50">+</span>
            <span className={cn(getBookingStatusConfig("confirmed").color)}>{confirmedCount}</span>
          </div>
        </div>
      </div>

      {/* Sheet for detailed view */}
      <BookingDetailsSheet isOpen={isOpen} onOpenChange={setIsOpen} bookings={bookings} />
    </>
  );
}

"use client";

import { useTransition } from "react";
import { Table2, Funnel, CalendarDays } from "lucide-react";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { cn } from "@/lib/utils";
import { useQueryStates } from "nuqs";
import { bookingsSearchParams } from "./bookings-searchparams";
import { BookingsTableView } from "./bookings-table-view";
import { BookingsCalendarView } from "./bookings-calendar-view";
import { CalendarSkeleton } from "./calendar/calendar-skeleton";
import type { BookingWithActivity, BookingsSearchParams } from "@/types/ops-bookings";

const SERVICE_TYPE_BUTTONS = [
  { value: "hotel", label: "Hotel" },
  { value: "tour", label: "Tour" },
  { value: "transfer", label: "Transfer" },
] as const;

const FILTER_RESET = {
  booking_status: [],
  payment_status: [],
  voucher_status: [],
  service_type: [],
  supplier: [],
  search: null,
  country: [],
  city: [],
  agency: [],
  start_date: null,
  end_date: null,
};

interface BookingsWrapperProps {
  searchParams: Omit<BookingsSearchParams, "search"> & { search: string | null | undefined };
  initialData: { data: BookingWithActivity[]; totalItems: number };
}

export function BookingsWrapper({ searchParams, initialData }: BookingsWrapperProps) {
  const [isPending, startTransition] = useTransition();
  const [{ view, service_type }, setParams] = useQueryStates(bookingsSearchParams, {
    shallow: false,
    startTransition,
  });

  const handleViewChange = (newView: "table" | "calendar") => {
    setParams({ view: newView, ...FILTER_RESET });
  };

  const handleServiceTypeFilter = (type: string) => {
    const isActive = service_type.length === 1 && service_type[0] === type;
    setParams({ service_type: isActive ? [] : [type] });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b px-3 py-2.5 shrink-0 gap-3">
        <p className="font-medium text-sm shrink-0">Bookings</p>

        <div className="flex items-center gap-1 shrink-0">
          {/* Service type filter — outline buttons */}
          {SERVICE_TYPE_BUTTONS.map(({ value, label }) => {
            const isActive = service_type.length === 1 && service_type[0] === value;
            return (
              <TooltipButton
                key={value}
                tooltip={`Filter by ${label}`}
                tooltipSide="bottom"
                size="icon-sm"
                variant="outline"
                className={cn(
                  "px-2.5 w-auto text-xs font-medium gap-1.5 border-dashed",
                  isActive
                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15 hover:text-primary"
                    : "text-muted-foreground"
                )}
                onClick={() => handleServiceTypeFilter(value)}
              >
                <Funnel className="size-3" />
                {label}
              </TooltipButton>
            );
          })}

          <div className="w-px h-4 bg-border mx-1" />

          {/* View switcher */}
          <TooltipButton
            tooltip="Table View"
            tooltipSide="bottom"
            size="icon-sm"
            variant="ghost"
            className={cn(
              view === "table"
                ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                : "text-muted-foreground"
            )}
            onClick={() => handleViewChange("table")}
          >
            <Table2 className="h-4 w-4" />
          </TooltipButton>
          <TooltipButton
            tooltip="Calendar View"
            tooltipSide="bottom"
            size="icon-sm"
            variant="ghost"
            className={cn(
              view === "calendar"
                ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                : "text-muted-foreground"
            )}
            onClick={() => handleViewChange("calendar")}
          >
            <CalendarDays className="h-4 w-4" />
          </TooltipButton>
        </div>
      </div>
      <div className="flex-1 px-6 py-4 flex flex-col overflow-hidden">
        {view === "grid" && <p className="text-muted-foreground">Grid View - Coming Soon</p>}
        {view === "table" && <BookingsTableView data={initialData} />}
        {view === "calendar" && (isPending ? <CalendarSkeleton /> : <BookingsCalendarView data={initialData} />)}
      </div>
    </div>
  );
}

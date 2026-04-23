"use client";

import { ReactNode } from "react";
import { IBookingServices } from "@/types/common";
import Show from "@/components/ui/show";
import { ScrollArea } from "@/components/ui/scroll-area";
import HotelMyBookingsFilters from "../hotels/my-bookings-filters";

interface MyBookingsWrapperProps {
  serviceType: IBookingServices;
  bookingsCount: number;
  children: ReactNode;
}

export default function MyBookingsWrapper({ serviceType, bookingsCount, children }: MyBookingsWrapperProps) {
  return (
    <div className="w-full h-full pr-10 space-y-4 relative">
      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-xl font-bold my-4">{bookingsCount} Bookings</p>

          <div className="space-y-4 pb-4">{children}</div>
        </div>
        <div className="sticky top-2 max-h-[calc(100vh-5rem)]">
          <Show when={serviceType === "hotel"}>
            <HotelMyBookingsFilters />
          </Show>
        </div>
      </div>
    </div>
  );
}

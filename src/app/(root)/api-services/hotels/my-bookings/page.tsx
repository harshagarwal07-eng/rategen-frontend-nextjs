import { Metadata } from "next";
import HotelMyBookingsWrapper from "@/components/api-services/hotels/hotel-my-bookings-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";

export const metadata: Metadata = {
  title: "My Hotel Bookings",
};

export default function MyBookingsPage() {
  return (
    <ScrollArea className="h-full w-full">
      <div className="w-full pb-6">
        <HotelMyBookingsWrapper />
      </div>
    </ScrollArea>
  );
}

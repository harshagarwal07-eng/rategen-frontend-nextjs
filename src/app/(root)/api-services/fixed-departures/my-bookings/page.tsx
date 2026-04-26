import { Metadata } from "next";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export const metadata: Metadata = {
  title: "My Fixed Departure Bookings",
};

// TODO: Implement when fd_bookings table + booking persistence layer is ready.
export default function FixedDeparturesBookingsPage() {
  return (
    <ScrollArea className="h-full w-full">
      <div className="w-full pb-6 pr-8">
        <div className="flex flex-col items-center justify-center text-center py-20 px-6 border border-dashed border-border/60 rounded-xl bg-muted/20">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Calendar className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No bookings yet</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Your booking history will appear here once you book a departure.
          </p>
          <Link href="/api-services/fixed-departures/search">
            <Button>Browse Packages</Button>
          </Link>
        </div>
      </div>
    </ScrollArea>
  );
}

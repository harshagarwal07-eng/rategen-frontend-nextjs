"use client";

import { format } from "date-fns";
import { CalendarDays, MapPin, Users, Hotel, Map as MapIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TripOverviewPanelProps {
  itinerary: any;
  isLoading?: boolean;
}

export default function TripOverviewPanel({ itinerary, isLoading }: TripOverviewPanelProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!itinerary?.itinerary_data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <MapIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No trip details available yet.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Start a conversation to generate an itinerary.</p>
      </div>
    );
  }

  const { itinerary_data, check_in, check_out, nights } = itinerary;
  const { travelers, destination, days } = itinerary_data;

  // Parse destination
  const destinationDisplay =
    typeof destination === "string" ? destination : destination?.country || destination?.city || "Unknown";

  // Get unique hotels
  const uniqueHotels = new Set<string>();
  days?.forEach((day: any) => {
    day.activities?.forEach((a: any) => {
      if (a.hotel_name) uniqueHotels.add(a.hotel_name);
    });
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <h3 className="font-semibold text-lg">Trip Overview</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {itinerary_data?.trip_name || `Exploring ${destinationDisplay}`}
          </p>
        </div>

        <Separator />

        {/* Destination */}
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Destination</p>
            <p className="font-medium">{destinationDisplay}</p>
          </div>
        </div>

        {/* Dates */}
        {check_in && check_out && (
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Travel Dates</p>
              <p className="font-medium">
                {format(new Date(check_in), "dd MMM yyyy")} - {format(new Date(check_out), "dd MMM yyyy")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{nights} {nights === 1 ? "night" : "nights"}</p>
            </div>
          </div>
        )}

        {/* Travelers */}
        {travelers && (
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Travelers</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {travelers.adults || 0} {travelers.adults === 1 ? "Adult" : "Adults"}
                </Badge>
                {travelers.children > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {travelers.children} {travelers.children === 1 ? "Child" : "Children"}
                  </Badge>
                )}
                {travelers.infants > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {travelers.infants} {travelers.infants === 1 ? "Infant" : "Infants"}
                  </Badge>
                )}
              </div>
              {/* Child ages if available */}
              {(travelers.children_ages?.length > 0 || itinerary.children_ages?.length > 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ages: {(travelers.children_ages || itinerary.children_ages)?.join(", ")} years
                </p>
              )}
            </div>
          </div>
        )}

        {/* Hotels List */}
        {uniqueHotels.size > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-2">Accommodations</p>
              <div className="space-y-2">
                {Array.from(uniqueHotels).map((hotelName, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Hotel className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    <span className="truncate">{hotelName}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

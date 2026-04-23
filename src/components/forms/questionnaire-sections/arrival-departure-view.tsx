"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Edit, Plane, Calendar, Users } from "lucide-react";
import type { ArrivalDeparture } from "@/types/questionnaire";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface ArrivalDepartureViewProps {
  arrivals?: ArrivalDeparture[];
  departures?: ArrivalDeparture[];
  internalFlights?: ArrivalDeparture[];
  guests?: Array<{ id: string; name: string }>;
  onEdit: () => void;
}

export function ArrivalDepartureView({
  arrivals = [],
  departures = [],
  internalFlights = [],
  guests = [],
  onEdit,
}: ArrivalDepartureViewProps) {
  const formatDate = (date: string | undefined) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "MMM dd, yyyy");
    } catch {
      return "-";
    }
  };

  const formatTime = (time: string | undefined) => {
    if (!time) return "-";
    return time;
  };

  const getGuestNames = (passengerIds?: string[]) => {
    if (!passengerIds || passengerIds.length === 0) return null;
    return passengerIds
      .map((id) => guests.find((g) => g.id === id)?.name)
      .filter(Boolean);
  };

  const FlightCard = ({
    flight,
    index,
  }: {
    flight: ArrivalDeparture;
    index: number;
  }) => {
    const guestNames = getGuestNames(flight.passenger_ids);
    const route =
      flight.from && flight.to ? `${flight.from} → ${flight.to}` : "-";
    const airline = flight.airline || "-";
    const flightNo = flight.flight_no || "-";

    return (
      <BorderedCard className="space-y-3">
        {/* First Row: Route and Flight Details */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-semibold">{route}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>•</span>
            <span>{airline}</span>
            <span>•</span>
            <span>{flightNo}</span>
          </div>
        </div>

        {/* Second Row: Arrival and Departure in single line */}
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Arrival:</span>
            <span className="font-medium">
              {formatDate(flight.arrival_date)}
              {flight.arrival_time && `, ${formatTime(flight.arrival_time)}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Departure:</span>
            <span className="font-medium">
              {formatDate(flight.dept_date)}
              {flight.dept_time && `, ${formatTime(flight.dept_time)}`}
            </span>
          </div>
        </div>

        {/* Third Row: Passengers (only if present) */}
        {guestNames && guestNames.length > 0 && (
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Passengers:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {guestNames.map((name, idx) => (
                <Badge key={idx} variant="outline">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </BorderedCard>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-background flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Arrival & Departure</h2>
          <p className="text-sm text-muted-foreground">
            Flight and transfer details
          </p>
        </div>
        <Button onClick={onEdit} variant="outline" size="sm" className="gap-2">
          <Edit className="h-3.5 w-3.5" />
          Edit Details
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 h-0">
        <div className="space-y-6 py-5 px-4">
          {/* Arrival Details Section */}
          <BorderedCard
            title={`Arrival Details (${arrivals.length})`}
            variant="dashed"
            collapsible
            defaultOpen
          >
            {arrivals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Plane className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No arrivals added</p>
              </div>
            ) : (
              <div className="space-y-3">
                {arrivals.map((arrival, index) => (
                  <FlightCard key={index} flight={arrival} index={index} />
                ))}
              </div>
            )}
          </BorderedCard>

          {/* Departure Details Section */}
          <BorderedCard
            title={`Departure Details (${departures.length})`}
            variant="dashed"
            collapsible
            defaultOpen
          >
            {departures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Plane className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No departures added</p>
              </div>
            ) : (
              <div className="space-y-3">
                {departures.map((departure, index) => (
                  <FlightCard key={index} flight={departure} index={index} />
                ))}
              </div>
            )}
          </BorderedCard>

          {/* Internal Flights Section */}
          <BorderedCard
            title={`Internal/Domestic Flights (${internalFlights.length})`}
            variant="dashed"
            collapsible
            defaultOpen
          >
            {internalFlights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Plane className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No internal flights added</p>
              </div>
            ) : (
              <div className="space-y-3">
                {internalFlights.map((flight, index) => (
                  <FlightCard key={index} flight={flight} index={index} />
                ))}
              </div>
            )}
          </BorderedCard>
        </div>
      </ScrollArea>
    </div>
  );
}

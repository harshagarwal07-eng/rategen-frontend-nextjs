"use client";

import { Plane, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FDPublicFlight, FDPublicPackage } from "@/types/fd-search";

interface PackageFlightsProps {
  pkg: FDPublicPackage;
}

const TYPE_LABEL: Record<string, string> = {
  outbound: "Outbound",
  inbound: "Return",
  internal: "Internal",
};

export function PackageFlights({ pkg }: PackageFlightsProps) {
  if (pkg.fd_flights.length === 0 && !pkg.flights_inclusion) return null;

  const grouped: Record<string, FDPublicFlight[]> = {};
  for (const f of pkg.fd_flights) {
    if (!grouped[f.flight_group]) grouped[f.flight_group] = [];
    grouped[f.flight_group].push(f);
  }
  Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));

  return (
    <section id="flights" className="space-y-4 scroll-mt-32">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Plane className="size-4 text-success" />
        Flights
      </h2>

      {pkg.flights_inclusion && (
        <p className="text-sm text-muted-foreground">{pkg.flights_inclusion}</p>
      )}

      <div className="space-y-3">
        {Object.entries(grouped).map(([groupName, flights]) => (
          <Card key={groupName} className="p-4 border-border/60 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{groupName}</h3>
              {!pkg.flights_included && (
                <Badge variant="outline" className="text-xs">
                  Optional
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              {flights.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 text-sm py-2 border-b border-border/40 last:border-0"
                >
                  <Plane className="size-4 text-muted-foreground shrink-0" />
                  <Badge variant="secondary" className="text-xs font-normal shrink-0">
                    {TYPE_LABEL[f.flight_type] || f.flight_type}
                  </Badge>
                  <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
                    <div className="text-right">
                      <div className="font-medium">{f.origin_airport || f.origin_city || "—"}</div>
                      {f.departure_time && (
                        <div className="text-xs text-muted-foreground">{f.departure_time}</div>
                      )}
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {f.destination_airport || f.destination_city || "—"}
                      </div>
                      {f.arrival_time && (
                        <div className="text-xs text-muted-foreground">{f.arrival_time}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    {f.airline}
                    {f.is_direct && <span className="ml-1.5">· Direct</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

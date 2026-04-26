"use client";

import { Users, Calendar as CalendarIcon, MapPin, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { FDPublicPackage } from "@/types/fd-search";

interface PackageOverviewProps {
  pkg: FDPublicPackage;
}

export function PackageOverview({ pkg }: PackageOverviewProps) {
  const ageBands = pkg.fd_age_policies.sort((a, b) => a.band_order - b.band_order);

  return (
    <section id="overview" className="space-y-4 scroll-mt-32">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Info className="size-4 text-primary" />
        Overview
      </h2>

      {pkg.description && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {pkg.description}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {pkg.departure_city && (
          <Card className="p-3 flex items-center gap-3 border-border/60 shadow-sm">
            <MapPin className="size-5 text-primary shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Departure city</div>
              <div className="text-sm font-medium">{pkg.departure_city}</div>
            </div>
          </Card>
        )}
        {pkg.max_group_size != null && (
          <Card className="p-3 flex items-center gap-3 border-border/60 shadow-sm">
            <Users className="size-5 text-primary shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Max group size</div>
              <div className="text-sm font-medium text-primary">{pkg.max_group_size} pax</div>
            </div>
          </Card>
        )}
        {pkg.age_restriction && (pkg.min_age != null || pkg.max_age != null) && (
          <Card className="p-3 flex items-center gap-3 border-border/60 shadow-sm">
            <CalendarIcon className="size-5 text-primary shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Age policy</div>
              <div className="text-sm font-medium">
                {pkg.min_age != null ? `${pkg.min_age}+` : "Any"}
                {pkg.max_age != null ? ` – ${pkg.max_age}` : ""}
              </div>
            </div>
          </Card>
        )}
      </div>

      {ageBands.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Age bands</h3>
          <div className="flex flex-wrap gap-2">
            {ageBands.map((b) => (
              <div
                key={b.id}
                className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-muted/30"
              >
                <span className="font-medium">{b.band_name}</span>
                <span className="text-muted-foreground ml-1.5">
                  {b.age_from ?? 0}
                  {b.age_to != null ? ` – ${b.age_to}` : "+"} yrs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

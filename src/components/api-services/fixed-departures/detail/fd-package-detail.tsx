"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { fdGetPackagePublic } from "@/data-access/fixed-departures";
import { PackageBanner } from "./package-banner";
import { PackageStickyBar } from "./package-sticky-bar";
import { PackageAnchorMenu, type AnchorSection } from "./package-anchor-menu";
import { PackageOverview } from "./package-overview";
import { PackageItinerary } from "./package-itinerary";
import { PackageInclusions } from "./package-inclusions";
import { PackageAddons } from "./package-addons";
import { PackageFlights } from "./package-flights";
import { PackageVisa } from "./package-visa";
import { PackagePolicies } from "./package-policies";
import { DeparturesSidebar } from "./departures-sidebar";

interface FDPackageDetailProps {
  packageId: string;
  backHref: string;
}

export function FDPackageDetail({ packageId, backHref }: FDPackageDetailProps) {
  const { data: pkg, isLoading, isError } = useQuery({
    queryKey: ["fd-package-public", packageId],
    queryFn: () => fdGetPackagePublic(packageId),
  });

  const upcomingDepartures = useMemo(() => {
    if (!pkg) return [];
    const today = new Date().toISOString().slice(0, 10);
    return pkg.departures
      .filter((d) => d.departure_date >= today)
      .sort((a, b) => a.departure_date.localeCompare(b.departure_date));
  }, [pkg]);

  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(null);

  const effectiveSelectedId = selectedDepartureId ?? upcomingDepartures[0]?.id ?? null;

  const selectedDeparture = useMemo(() => {
    if (!effectiveSelectedId) return null;
    return upcomingDepartures.find((d) => d.id === effectiveSelectedId) ?? null;
  }, [upcomingDepartures, effectiveSelectedId]);

  const bannerRef = useRef<HTMLDivElement | null>(null);

  if (isLoading) {
    return (
      <div className="w-full pr-8 space-y-6">
        <Skeleton className="h-[320px] w-full rounded-xl" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !pkg) {
    return (
      <div className="w-full pr-8 py-20 text-center">
        <p className="text-sm text-destructive">Couldn&apos;t load package details.</p>
      </div>
    );
  }

  const sections: AnchorSection[] = [
    { id: "overview", label: "Overview", show: true },
    { id: "itinerary", label: "Itinerary", show: pkg.fd_itinerary_days.length > 0 },
    {
      id: "inclusions",
      label: "Inclusions & Exclusions",
      show: [
        pkg.inc_hotels,
        pkg.inc_meals,
        pkg.inc_guide,
        pkg.inc_tours,
        pkg.inc_transfers,
        pkg.inc_taxes,
        pkg.inc_other,
        pkg.exc_hotels,
        pkg.exc_meals,
        pkg.exc_guide,
        pkg.exc_tours,
        pkg.exc_transfers,
        pkg.exc_taxes,
        pkg.exc_other,
      ].some((v) => (Array.isArray(v) ? v.length > 0 : !!v)),
    },
    { id: "addons", label: "Add-ons", show: pkg.fd_addons.length > 0 },
    { id: "flights", label: "Flights", show: pkg.fd_flights.length > 0 || !!pkg.flights_inclusion },
    { id: "visa", label: "Visa & Insurance", show: !!pkg.fd_visa || !!pkg.visa_inclusion },
    { id: "policies", label: "Policies", show: true },
  ];

  return (
    <div className="w-full pr-8 space-y-6">
      <PackageStickyBar pkg={pkg} selectedDeparture={selectedDeparture} bannerRef={bannerRef} />

      <div ref={bannerRef}>
        <PackageBanner pkg={pkg} nextDeparture={upcomingDepartures[0] ?? null} backHref={backHref} />
      </div>

      <PackageAnchorMenu sections={sections} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-10 min-w-0">
          <PackageOverview pkg={pkg} />
          {pkg.fd_itinerary_days.length > 0 && (
            <PackageItinerary days={pkg.fd_itinerary_days} />
          )}
          <PackageInclusions pkg={pkg} />
          {pkg.fd_addons.length > 0 && (
            <PackageAddons addons={pkg.fd_addons} currency={pkg.currency} />
          )}
          {(pkg.fd_flights.length > 0 || pkg.flights_inclusion) && <PackageFlights pkg={pkg} />}
          {(pkg.fd_visa || pkg.visa_inclusion) && <PackageVisa pkg={pkg} />}
          <PackagePolicies pkg={pkg} selectedDeparture={selectedDeparture} />
        </div>

        <aside className="lg:sticky lg:top-32 self-start">
          <DeparturesSidebar
            pkg={pkg}
            departures={upcomingDepartures}
            selectedId={effectiveSelectedId}
            onSelect={setSelectedDepartureId}
          />
        </aside>
      </div>
    </div>
  );
}

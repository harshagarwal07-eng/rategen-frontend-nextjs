"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Calendar,
  Clock,
  ImageIcon,
  MapPin,
  Plane,
  StickyNote,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FDSearchPackage } from "@/types/fd-search";

interface FDResultCardProps {
  pkg: FDSearchPackage;
  detailHref: string;
}

function formatPrice(amount: number, currency: string | null): string {
  const code = currency || "INR";
  if (code === "INR") return `₹${amount.toLocaleString("en-IN")}`;
  return `${code} ${amount.toLocaleString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function FDResultCard({ pkg, detailHref }: FDResultCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const upcoming = [...pkg.matching_departures].sort((a, b) =>
    a.departure_date.localeCompare(b.departure_date),
  );
  const nextDep = upcoming[0];
  const cityNames = pkg.cities.map((c) => c.name).join(", ");
  const countryNames = pkg.countries.map((c) => c.name).join(" · ");

  return (
    <Card className="overflow-hidden p-0 bg-card border-border/60 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-300 group flex flex-col">
      <div className="relative w-full aspect-video bg-muted overflow-hidden">
        {!imageLoaded && pkg.main_image_url && <Skeleton className="w-full h-full absolute" />}
        {pkg.main_image_url ? (
          <Image
            src={pkg.main_image_url}
            alt={pkg.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            onLoad={() => setImageLoaded(true)}
            className={cn(
              "object-cover transition-all duration-500 group-hover:scale-105",
              imageLoaded ? "opacity-100" : "opacity-0",
            )}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageIcon className="size-8" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {pkg.flights_included && (
            <Badge className="bg-success text-success-foreground border-0 gap-1 text-[10px] px-1.5 py-0.5">
              <Plane className="size-2.5" />
              Flights
            </Badge>
          )}
          {pkg.visa_included && (
            <Badge className="bg-success text-success-foreground border-0 gap-1 text-[10px] px-1.5 py-0.5">
              <StickyNote className="size-2.5" />
              Visa
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2.5">
        <div className="space-y-1">
          {countryNames && (
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">
              {countryNames}
            </div>
          )}
          <h3 className="text-base font-semibold leading-snug line-clamp-2">{pkg.name}</h3>
          {cityNames && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground truncate cursor-default">
                    {cityNames}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {cityNames}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="size-3.5" />
            <span>
              {pkg.duration_nights}N / {pkg.duration_nights + 1}D
            </span>
          </div>
          {pkg.total_matching_departures > 0 && (
            <div className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              <span>
                {pkg.total_matching_departures} departure
                {pkg.total_matching_departures === 1 ? "" : "s"}
              </span>
            </div>
          )}
          {pkg.max_group_size != null && (
            <div className="flex items-center gap-1">
              <Users className="size-3.5" />
              <span>Max {pkg.max_group_size}</span>
            </div>
          )}
        </div>

        {pkg.departure_city && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            <span>From {pkg.departure_city}</span>
          </div>
        )}

        <div className="flex items-end justify-between gap-3 mt-auto pt-2 border-t border-border/60">
          <div className="min-w-0">
            {nextDep ? (
              <>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Next departure
                </div>
                <div className="text-xs font-medium truncate">
                  {formatDate(nextDep.departure_date)}
                </div>
              </>
            ) : (
              <div className="text-[10px] text-muted-foreground">No upcoming dates</div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">From</div>
            <div className="text-lg font-semibold tracking-tight leading-none">
              {pkg.from_price != null ? formatPrice(pkg.from_price, pkg.currency) : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              per adult
            </div>
          </div>
        </div>

        <Link href={detailHref} className="w-full mt-1">
          <Button size="sm" className="w-full">
            View Details
          </Button>
        </Link>
      </div>
    </Card>
  );
}

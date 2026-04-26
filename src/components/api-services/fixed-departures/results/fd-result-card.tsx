"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MapPin, Clock, Calendar, ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function FDResultCard({ pkg, detailHref }: FDResultCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const visibleCities = pkg.cities.slice(0, 3);
  const extraCities = pkg.cities.length - visibleCities.length;

  const upcoming = [...pkg.matching_departures].sort((a, b) =>
    a.departure_date.localeCompare(b.departure_date),
  );
  const nextDep = upcoming[0];
  const moreDeps = pkg.total_matching_departures - 1;

  return (
    <Card className="w-full overflow-hidden p-0 bg-card border-border/60 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-300 group">
      <div className="grid grid-cols-12 gap-4 p-4">
        <div className="col-span-3">
          <div className="relative w-full h-full rounded-lg overflow-hidden bg-muted min-h-[160px]">
            {!imageLoaded && pkg.main_image_url && <Skeleton className="w-full h-full absolute" />}
            {pkg.main_image_url ? (
              <Image
                src={pkg.main_image_url}
                alt={pkg.name}
                fill
                sizes="(max-width: 768px) 100vw, 25vw"
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
          </div>
        </div>

        <div className="col-span-7 flex flex-col gap-2">
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold leading-tight line-clamp-2">{pkg.name}</h3>
            {pkg.tour_code && (
              <p className="text-xs text-muted-foreground">Tour code · {pkg.tour_code}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {visibleCities.map((c) => (
              <Badge key={c.id} variant="secondary" className="font-normal">
                {c.name}
              </Badge>
            ))}
            {extraCities > 0 && (
              <Badge variant="outline" className="font-normal">
                +{extraCities} more
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-2">
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              <span>
                {pkg.duration_nights}N / {pkg.duration_nights + 1}D
              </span>
            </div>
            {pkg.countries[0] && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                <span>{pkg.countries.map((c) => c.name).join(", ")}</span>
              </div>
            )}
          </div>

          {nextDep && (
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <Calendar className="size-3.5 text-primary" />
              <span>Next: {formatDate(nextDep.departure_date)}</span>
              {moreDeps > 0 && (
                <span className="text-muted-foreground font-normal">+{moreDeps} more</span>
              )}
            </div>
          )}
        </div>

        <div className="col-span-2 flex flex-col justify-between items-end gap-3">
          <div className="text-right space-y-0.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">From</div>
            <div className="text-2xl font-semibold tracking-tight">
              {pkg.from_price != null ? formatPrice(pkg.from_price, pkg.currency) : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              per adult · double occupancy
            </div>
          </div>

          <Link href={detailHref} className="w-full">
            <Button size="default" className="w-full font-medium">
              View Details
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

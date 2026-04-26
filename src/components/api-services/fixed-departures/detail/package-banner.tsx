"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ImageIcon, MapPin, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FDPublicPackage, FDPublicDeparture } from "@/types/fd-search";

interface PackageBannerProps {
  pkg: FDPublicPackage;
  nextDeparture: FDPublicDeparture | null;
  backHref: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PackageBanner({ pkg, nextDeparture, backHref }: PackageBannerProps) {
  const banner = pkg.banner_image_url || pkg.main_image_url;

  return (
    <div className="relative w-full h-[320px] rounded-xl overflow-hidden bg-muted">
      {banner ? (
        <Image src={banner} alt={pkg.name} fill priority sizes="100vw" className="object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <ImageIcon className="size-12" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <Link href={backHref} className="absolute top-4 left-4 z-10">
        <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white text-foreground">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </Link>

      <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {pkg.countries.map((c) => (
            <Badge key={c.id} className="bg-white/20 backdrop-blur-sm text-white border-white/30">
              {c.name}
            </Badge>
          ))}
          {pkg.cities.slice(0, 4).map((c) => (
            <Badge
              key={c.id}
              variant="outline"
              className="bg-transparent border-white/40 text-white"
            >
              {c.name}
            </Badge>
          ))}
        </div>
        <h1 className="text-3xl font-bold leading-tight">{pkg.name}</h1>
        {pkg.tour_code && <p className="text-sm text-white/80">Tour code · {pkg.tour_code}</p>}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
          <div className="flex items-center gap-1.5">
            <Clock className="size-4" />
            <span>
              {pkg.duration_nights}N / {pkg.duration_nights + 1}D
            </span>
          </div>
          {pkg.departure_city && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              <span>From {pkg.departure_city}</span>
            </div>
          )}
          {nextDeparture && (
            <div className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              <span>Next: {formatDate(nextDeparture.departure_date)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

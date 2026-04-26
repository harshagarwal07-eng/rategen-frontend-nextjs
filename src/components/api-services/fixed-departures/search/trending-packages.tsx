"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, MapPin, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// TODO: Replace with real trending logic when backend supports it.
// Click navigates to results filtered by the package's main country
// (we don't hardcode package IDs to avoid 404 if the demo data isn't seeded).
interface TrendingItem {
  id: string;
  name: string;
  imageUrl: string;
  countries: string[];
  cities: string[];
  durationNights: number;
  fromPrice: number;
  currency: string;
  countrySearchId?: string;
}

const TRENDING: TrendingItem[] = [
  {
    id: "trending-1",
    name: "Bali Bliss — Beaches, Temples & Volcanoes",
    imageUrl: "https://images.pexels.com/photos/2474690/pexels-photo-2474690.jpeg",
    countries: ["Indonesia"],
    cities: ["Ubud", "Seminyak", "Nusa Dua"],
    durationNights: 7,
    fromPrice: 89000,
    currency: "INR",
  },
  {
    id: "trending-2",
    name: "Maldives Romantic Escape",
    imageUrl: "https://images.pexels.com/photos/1483053/pexels-photo-1483053.jpeg",
    countries: ["Maldives"],
    cities: ["Malé"],
    durationNights: 5,
    fromPrice: 145000,
    currency: "INR",
  },
  {
    id: "trending-3",
    name: "Switzerland Alpine Wonders",
    imageUrl: "https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg",
    countries: ["Switzerland"],
    cities: ["Zurich", "Lucerne", "Interlaken", "Zermatt"],
    durationNights: 9,
    fromPrice: 215000,
    currency: "INR",
  },
  {
    id: "trending-4",
    name: "Japan in Bloom — Tokyo to Kyoto",
    imageUrl: "https://images.pexels.com/photos/2070033/pexels-photo-2070033.jpeg",
    countries: ["Japan"],
    cities: ["Tokyo", "Kyoto", "Osaka"],
    durationNights: 8,
    fromPrice: 178000,
    currency: "INR",
  },
  {
    id: "trending-5",
    name: "Dubai City & Desert",
    imageUrl: "https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg",
    countries: ["UAE"],
    cities: ["Dubai", "Abu Dhabi"],
    durationNights: 5,
    fromPrice: 65000,
    currency: "INR",
  },
  {
    id: "trending-6",
    name: "Thailand Island Hopping",
    imageUrl: "https://images.pexels.com/photos/1450354/pexels-photo-1450354.jpeg",
    countries: ["Thailand"],
    cities: ["Bangkok", "Phuket", "Krabi"],
    durationNights: 7,
    fromPrice: 72000,
    currency: "INR",
  },
];

function formatPrice(amount: number, currency: string): string {
  if (currency === "INR") return `₹${amount.toLocaleString("en-IN")}`;
  return `${currency} ${amount.toLocaleString()}`;
}

export function TrendingPackages() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-lg font-semibold">Trending packages</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TRENDING.map((pkg) => (
          <TrendingCard key={pkg.id} pkg={pkg} />
        ))}
      </div>
    </section>
  );
}

function TrendingCard({ pkg }: { pkg: TrendingItem }) {
  // For now, link to results page filtered by country name keyword via no-op (no real ID).
  // When real trending exists, this becomes /package/[id].
  const href = `/api-services/fixed-departures/search`;

  return (
    <Link href={href}>
      <Card
        className={cn(
          "overflow-hidden p-0 group cursor-pointer border-border/60 shadow-sm",
          "hover:shadow-md hover:border-border transition-all duration-300 hover:-translate-y-0.5",
        )}
      >
        <div className="relative w-full h-40 bg-muted overflow-hidden">
          <Image
            src={pkg.imageUrl}
            alt={pkg.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border-0 gap-1">
            <Sparkles className="size-3" />
            Trending
          </Badge>
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{pkg.name}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{pkg.cities.slice(0, 3).join(" • ")}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3" />
              <span>
                {pkg.durationNights}N / {pkg.durationNights + 1}D
              </span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">From</div>
              <div className="text-sm font-bold">{formatPrice(pkg.fromPrice, pkg.currency)}</div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

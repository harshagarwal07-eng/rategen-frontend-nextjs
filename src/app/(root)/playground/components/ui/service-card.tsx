"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Users, Clock, MapPin, Utensils, Car, Hotel, Compass, Package } from "lucide-react";
import { cn } from "@/lib/utils";

// =====================================================
// SERVICE CARD - Clean design with image
// Based on user reference: Image + Title + Rating + Price
// =====================================================

export interface ServiceCardData {
  type: "tour" | "hotel" | "transfer" | "combo" | "free";
  id?: string;
  name: string;
  subtitle?: string;
  image_url?: string;
  rating?: number;
  review_count?: number;
  price?: number;
  price_label?: string; // e.g., "per person", "per night"
  currency?: string;
  showPricing?: boolean;
  // Additional details
  duration?: string;
  participants?: number;
  location?: string;
  // Hotel specific
  room_type?: string;
  meal_plan?: string;
  nights?: number;
  // Transfer specific
  transfer_type?: string;
  vehicle?: string;
  route?: string;
}

// Color schemes for different service types
const serviceColors = {
  tour: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    icon: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    price: "text-emerald-700 dark:text-emerald-400",
  },
  hotel: {
    border: "border-l-blue-500",
    bg: "bg-blue-50/50 dark:bg-blue-950/20",
    icon: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    price: "text-blue-700 dark:text-blue-400",
  },
  transfer: {
    border: "border-l-orange-500",
    bg: "bg-orange-50/50 dark:bg-orange-950/20",
    icon: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
    price: "text-orange-700 dark:text-orange-400",
  },
  combo: {
    border: "border-l-purple-500",
    bg: "bg-purple-50/50 dark:bg-purple-950/20",
    icon: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    price: "text-purple-700 dark:text-purple-400",
  },
  free: {
    border: "border-l-gray-400",
    bg: "bg-gray-50/50 dark:bg-gray-900/20",
    icon: "text-gray-500 dark:text-gray-400",
    iconBg: "bg-gray-100 dark:bg-gray-800/40",
    price: "text-gray-600 dark:text-gray-400",
  },
};

const serviceIcons = {
  tour: Compass,
  hotel: Hotel,
  transfer: Car,
  combo: Package,
  free: Clock,
};

// Placeholder images per service type
const placeholderImages = {
  tour: "/images/placeholders/tour-placeholder.jpg",
  hotel: "/images/placeholders/hotel-placeholder.jpg",
  transfer: "/images/placeholders/transfer-placeholder.jpg",
  combo: "/images/placeholders/combo-placeholder.jpg",
  free: "/images/placeholders/activity-placeholder.jpg",
};

export function ServiceCard({ data }: { data: ServiceCardData }) {
  const colors = serviceColors[data.type] || serviceColors.free;
  const Icon = serviceIcons[data.type] || Clock;
  const hasImage = !!data.image_url;
  const showPrice = data.showPricing !== false && data.price !== undefined;

  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4 my-3",
        colors.border,
        colors.bg,
        "hover:shadow-md transition-all duration-200"
      )}
    >
      <div className="flex">
        {/* Image or Icon placeholder */}
        <div className="relative w-24 h-24 md:w-28 md:h-28 flex-shrink-0">
          {hasImage ? (
            <Image
              src={data.image_url!}
              alt={data.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 96px, 112px"
            />
          ) : (
            <div className={cn("w-full h-full flex items-center justify-center", colors.iconBg)}>
              <Icon className={cn("w-8 h-8 md:w-10 md:h-10", colors.icon)} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Title */}
              <h4 className="font-semibold text-sm md:text-base leading-tight line-clamp-1">
                {data.name}
              </h4>
              {/* Subtitle */}
              {data.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{data.subtitle}</p>
              )}
            </div>

            {/* Type badge for transfers */}
            {data.type === "transfer" && data.transfer_type && (
              <Badge variant="outline" className="flex-shrink-0 text-xs">
                {data.transfer_type}
              </Badge>
            )}
          </div>

          {/* Rating */}
          {data.rating !== undefined && data.rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-3 h-3",
                      i < Math.floor(data.rating!)
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
                    )}
                  />
                ))}
              </div>
              {data.review_count !== undefined && (
                <span className="text-xs text-muted-foreground">({data.review_count})</span>
              )}
            </div>
          )}

          {/* Details row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
            {data.participants !== undefined && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {data.participants} pax
              </span>
            )}
            {data.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {data.duration}
              </span>
            )}
            {data.nights !== undefined && (
              <span className="flex items-center gap-1">
                <Hotel className="w-3 h-3" />
                {data.nights}N
              </span>
            )}
            {data.meal_plan && (
              <span className="flex items-center gap-1">
                <Utensils className="w-3 h-3" />
                {data.meal_plan}
              </span>
            )}
            {data.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{data.location}</span>
              </span>
            )}
          </div>

          {/* Price */}
          {showPrice && (
            <div className="flex items-end justify-end mt-1.5">
              <div className="text-right">
                <span className={cn("font-bold text-base md:text-lg", colors.price)}>
                  {data.currency || "USD"} {data.price?.toLocaleString()}
                </span>
                {data.price_label && (
                  <span className="text-xs text-muted-foreground ml-1">/{data.price_label}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// INLINE SERVICE CARD - Compact version for inline rendering
// =====================================================

export function InlineServiceCard({ data }: { data: ServiceCardData }) {
  const colors = serviceColors[data.type] || serviceColors.free;
  const Icon = serviceIcons[data.type] || Clock;
  const hasImage = !!data.image_url;
  const showPrice = data.showPricing !== false && data.price !== undefined;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-l-4 px-2 py-1.5 my-1",
        colors.border,
        colors.bg,
        "hover:shadow-sm transition-shadow"
      )}
    >
      {/* Small image or icon */}
      <div className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden">
        {hasImage ? (
          <Image src={data.image_url!} alt={data.name} fill className="object-cover" sizes="32px" />
        ) : (
          <div className={cn("w-full h-full flex items-center justify-center rounded", colors.iconBg)}>
            <Icon className={cn("w-4 h-4", colors.icon)} />
          </div>
        )}
      </div>

      {/* Name and price inline */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium text-sm truncate max-w-[200px]">{data.name}</span>
        {showPrice && (
          <span className={cn("font-semibold text-sm whitespace-nowrap", colors.price)}>
            {data.currency || "USD"} {data.price?.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

export default ServiceCard;

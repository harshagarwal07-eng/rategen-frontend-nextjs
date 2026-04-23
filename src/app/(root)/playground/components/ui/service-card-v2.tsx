"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Users, Car, Hotel, Compass, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

// =====================================================
// SERVICE CARD V2 - Hero Image Style (Mindtrip-inspired)
// Full-height image with text overlay at bottom
// =====================================================

export interface ServiceCardV2Data {
  type: "tour" | "hotel" | "transfer" | "combo" | "meal";
  id?: string;
  name: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  rating?: number;
  review_count?: number;
  location?: string;
  price?: number;
  currency?: string;
  showPricing?: boolean;
  // Additional details
  duration?: string;
  participants?: number;
  // Type specific
  transfer_type?: string;
  service_context?: string; // e.g., "From Burj Khalifa to Dubai Desert Safari"
  vehicle?: string;
  meal_plan?: string;
  room_type?: string;
}

// Gradient backgrounds for cards without images
const typeGradients: Record<string, string> = {
  tour: "from-emerald-500 to-teal-700",
  hotel: "from-blue-500 to-indigo-700",
  transfer: "from-orange-500 to-red-600",
  combo: "from-purple-500 to-pink-600",
  meal: "from-amber-500 to-orange-600",
};

const typeIcons: Record<string, typeof Compass> = {
  tour: Compass,
  hotel: Hotel,
  transfer: Car,
  combo: Compass,
  meal: Utensils,
};

/**
 * ServiceCardV2 - Hero image card with overlay text
 * Used in day carousels and hover popovers
 */
export function ServiceCardV2({
  data,
  size = "default",
  className,
}: {
  data: ServiceCardV2Data;
  size?: "default" | "small" | "large";
  className?: string;
}) {
  const Icon = typeIcons[data.type] || Compass;
  const gradient = typeGradients[data.type] || typeGradients.tour;
  const hasImage = !!data.image_url;
  const showPrice = data.showPricing !== false && data.price !== undefined;

  // Size configurations
  const sizeClasses = {
    small: "w-40 h-48",
    default: "w-52 h-64",
    large: "w-64 h-80",
  };

  return (
    <Card
      className={cn(
        "overflow-hidden flex-shrink-0 group cursor-pointer border-0 shadow-lg",
        "hover:shadow-xl transition-all duration-300 hover:scale-[1.02]",
        sizeClasses[size],
        className
      )}
    >
      <div className="relative w-full h-full">
        {/* Background Image or Gradient */}
        {hasImage ? (
          <Image
            src={data.image_url!}
            alt={data.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 160px, 208px"
          />
        ) : (
          <div
            className={cn(
              "w-full h-full bg-gradient-to-br flex items-center justify-center",
              gradient
            )}
          >
            <Icon className="w-16 h-16 text-white/50" />
          </div>
        )}

        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Content overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          {/* Price badge at top-left if showing */}
          {showPrice && (
            <div className="absolute -top-8 left-0">
              <span className="text-xs font-medium text-white/90">
                From {data.currency || "USD"} {data.price?.toLocaleString()}
              </span>
            </div>
          )}

          {/* Name */}
          <h4 className="font-semibold text-sm md:text-base line-clamp-2 leading-tight">
            {data.name}
          </h4>

          {/* Rating */}
          {data.rating !== undefined && data.rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium">{data.rating.toFixed(1)}</span>
              {data.review_count !== undefined && (
                <span className="text-xs text-white/70">· {data.review_count.toLocaleString()}</span>
              )}
            </div>
          )}

          {/* Location or subtitle - for transfers, prefer service_context */}
          {(data.service_context || data.location || data.subtitle) && (
            <p className="text-xs text-white/80 mt-0.5 line-clamp-1">
              {data.type === "transfer" && data.service_context
                ? data.service_context
                : data.location || data.subtitle}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * ServiceCardV2Detailed - Expanded card with more details
 * Used in hover popovers
 */
export function ServiceCardV2Detailed({
  data,
  className,
}: {
  data: ServiceCardV2Data;
  className?: string;
}) {
  const Icon = typeIcons[data.type] || Compass;
  const gradient = typeGradients[data.type] || typeGradients.tour;
  const hasImage = !!data.image_url;
  const showPrice = data.showPricing !== false && data.price !== undefined;

  return (
    <Card className={cn("w-72 overflow-hidden border shadow-xl", className)}>
      {/* Image section */}
      <div className="relative h-40 w-full">
        {hasImage ? (
          <Image
            src={data.image_url!}
            alt={data.name}
            fill
            className="object-cover"
            sizes="288px"
          />
        ) : (
          <div
            className={cn(
              "w-full h-full bg-gradient-to-br flex items-center justify-center",
              gradient
            )}
          >
            <Icon className="w-12 h-12 text-white/60" />
          </div>
        )}

        {/* Image carousel dots placeholder */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm line-clamp-1">{data.name}</h4>
          {data.rating !== undefined && data.rating > 0 && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              <span className="text-xs font-medium">{data.rating.toFixed(1)}</span>
              {data.review_count !== undefined && (
                <span className="text-xs text-muted-foreground">({data.review_count.toLocaleString()})</span>
              )}
            </div>
          )}
        </div>

        {/* Type badge */}
        <div className="flex items-center gap-1 mt-1">
          <Icon className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground capitalize">{data.type}</span>
        </div>

        {/* Service context for transfers, or location for others */}
        {data.type === "transfer" && data.service_context ? (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Car className="w-3 h-3" />
            {data.service_context}
          </p>
        ) : data.location ? (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {data.location}
          </p>
        ) : null}

        {/* Description */}
        {data.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
            {data.description}
          </p>
        )}

        {/* Details row */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
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
        </div>

        {/* Price */}
        {showPrice && (
          <div className="mt-2 pt-2 border-t">
            <span className="font-bold text-primary">
              {data.currency || "USD"} {data.price?.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground ml-1">total</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ServiceCardV2;

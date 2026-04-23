"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import S3Image from "@/components/ui/s3-image";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Car,
  Compass,
  Hotel,
  Utensils,
  Plane,
  Moon,
  Star,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =====================================================
// TYPES
// =====================================================

export type ServiceType = "tour" | "hotel" | "transfer" | "combo" | "meal" | "flight";

export interface ServiceCardData {
  id?: string;
  type: ServiceType;
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
  duration?: string;
  participants?: number;
  time?: string;
  // Type-specific
  transfer_type?: string;
  vehicle?: string;
  meal_plan?: string;
  room_type?: string;
  basis?: string;
  service_context?: string; // e.g., "From Hotel to Global Village"
}

export interface ItineraryDayData {
  day: number;
  date?: string;
  title: string;
  activities: ServiceCardData[];
  overnight?: string;
}

export interface ModernItineraryProps {
  days: ItineraryDayData[];
  currency?: string;
  showPricing?: boolean;
  className?: string;
  hideHeader?: boolean; // For inline mode
}

// =====================================================
// CONSTANTS
// =====================================================

const typeConfig: Record<ServiceType, { icon: typeof Compass; label: string }> = {
  tour: { icon: Compass, label: "Tour" },
  hotel: { icon: Hotel, label: "Hotel" },
  transfer: { icon: Car, label: "Transfer" },
  combo: { icon: Package, label: "Combo" },
  meal: { icon: Utensils, label: "Meal" },
  flight: { icon: Plane, label: "Flight" },
};

// =====================================================
// SERVICE CARD COMPONENT
// =====================================================

function ServiceCard({
  data,
  showPricing = false,
  currency = "USD",
}: {
  data: ServiceCardData;
  showPricing?: boolean;
  currency?: string;
}) {
  const config = typeConfig[data.type] || typeConfig.tour;
  const Icon = config.icon;
  const hasImage = !!data.image_url;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Card className={cn("w-44 h-56 flex-shrink-0 overflow-hidden cursor-pointer shadow-none border-2", "p-0")}>
          <div className="relative w-full h-full">
            {/* Background */}
            {hasImage ? (
              <S3Image
                url={data.image_url!}
                alt={data.name}
                fill
                className="object-cover"
                sizes="176px"
                fallback={
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Icon className="w-12 h-12 text-muted-foreground" />
                  </div>
                }
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Icon className="w-12 h-12 text-muted-foreground" />
              </div>
            )}

            {/* Type badge */}
            <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5">
              {config.label}
            </Badge>

            {/* Time badge */}
            {data.time && (
              <Badge variant="outline" className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-muted">
                {data.time}
              </Badge>
            )}

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/60 backdrop-blur-xl">
              {/* Price */}
              {showPricing && data.price !== undefined && (
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                  {currency} {data.price.toLocaleString()}
                </p>
              )}

              {/* Name */}
              <h4 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">{data.name}</h4>

              {/* Rating */}
              {data.rating !== undefined && data.rating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 fill-primary text-primary" />
                  <span className="text-xs text-foreground">{data.rating.toFixed(1)}</span>
                </div>
              )}

              {/* Subtitle - for transfers, show service_context if available */}
              {(data.service_context || data.subtitle) && (
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {data.type === "transfer" && data.service_context
                    ? data.service_context
                    : data.subtitle}
                </p>
              )}
            </div>
          </div>
        </Card>
      </HoverCardTrigger>

      {/* Hover popover with details */}
      <HoverCardContent className="w-72 p-0" side="right" align="start" sideOffset={8}>
        <div className="relative h-32 w-full">
          {hasImage ? (
            <S3Image
              url={data.image_url!}
              alt={data.name}
              fill
              className="object-cover rounded-t-md"
              sizes="288px"
              fallback={
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Icon className="w-10 h-10 text-muted-foreground" />
                </div>
              }
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Icon className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm line-clamp-2">{data.name}</h4>
            {data.rating !== undefined && data.rating > 0 && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star className="w-3 h-3 fill-primary text-primary" />
                <span className="text-xs font-medium">{data.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {data.description && <p className="text-xs text-muted-foreground line-clamp-3">{data.description}</p>}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {data.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {data.duration}
              </span>
            )}
            {data.participants && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {data.participants} pax
              </span>
            )}
            {/* For transfers, show service_context; for others, show location */}
            {data.type === "transfer" && data.service_context ? (
              <span className="flex items-center gap-1">
                <Car className="w-3 h-3" />
                {data.service_context}
              </span>
            ) : data.location ? (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {data.location}
              </span>
            ) : null}
          </div>

          {showPricing && data.price !== undefined && (
            <div className="pt-2 border-t">
              <span className="font-bold text-primary">
                {currency} {data.price.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// =====================================================
// ACTIVITIES GRID COMPONENT (replaces carousel)
// =====================================================

function ActivitiesGrid({
  activities,
  showPricing,
  currency,
}: {
  activities: ServiceCardData[];
  showPricing: boolean;
  currency: string;
}) {
  if (!activities || activities.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {activities.map((activity, index) => (
        <ServiceCard
          key={activity.id || `activity-${index}`}
          data={activity}
          showPricing={showPricing}
          currency={currency}
        />
      ))}
    </div>
  );
}

// =====================================================
// DAY SECTION COMPONENT
// =====================================================

function DaySection({
  day,
  showPricing,
  currency,
  isLast,
}: {
  day: ItineraryDayData;
  showPricing: boolean;
  currency: string;
  isLast: boolean;
}) {
  const formattedDate = day.date
    ? new Date(day.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className={cn("relative", !isLast && "pb-6")}>
      {/* Day header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Day number circle */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground font-bold text-lg">
            {day.day}
          </div>
          {/* Connector line */}
          {!isLast && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-0.5 h-[calc(100%+1.5rem)] bg-border" />
          )}
        </div>

        {/* Day info */}
        <div className="flex-1 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base">Day {day.day}</h3>
            {formattedDate && (
              <Badge variant="outline" className="text-xs font-normal">
                <Calendar className="w-3 h-3 mr-1" />
                {formattedDate}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{day.title}</p>
        </div>
      </div>

      {/* Activities grid */}
      <div className="ml-16">
        <ActivitiesGrid activities={day.activities} showPricing={showPricing} currency={currency} />

        {/* Overnight info */}
        {day.overnight && (
          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <Moon className="w-4 h-4" />
            <span>Overnight: {day.overnight}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function ModernItinerary({
  days,
  currency = "USD",
  showPricing = false,
  className,
  hideHeader = false,
}: ModernItineraryProps) {
  if (!days || days.length === 0) return null;

  // Inline mode - just render the activities grid without wrapper
  if (hideHeader && days.length === 1) {
    const day = days[0];
    if (!day.activities || day.activities.length === 0) return null;

    return (
      <div className={cn("py-2", className)}>
        <ActivitiesGrid activities={day.activities} showPricing={showPricing} currency={currency} />
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header - hide in inline mode */}
      {!hideHeader && (
        <div className="px-4 py-3 border-b bg-muted">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-semibold text-sm">Day-Wise Itinerary</h2>
            <Badge variant="secondary" className="ml-auto text-xs">
              {days.length} Days
            </Badge>
          </div>
        </div>
      )}

      {/* Days */}
      <CardContent className={cn("p-4", hideHeader && "p-0")}>
        {days.map((day, index) => (
          <DaySection
            key={day.day}
            day={day}
            showPricing={showPricing}
            currency={currency}
            isLast={index === days.length - 1}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export default ModernItinerary;

"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Hotel,
  Compass,
  Car,
  Package,
  Calendar,
  Users,
  Clock,
  MapPin,
  Utensils,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface ItineraryHotelCardProps {
  hotel_name: string;
  star_rating?: string;
  room_category: string;
  meal_plan?: string;
  nights: number;
  rate_per_night?: number;
  total?: number;
  currency?: string;
  showPricing?: boolean;
}

export interface ItineraryTourCardProps {
  tour_name: string;
  package_name?: string;
  duration?: string;
  participants?: number;
  rate_per_person?: number;
  total?: number;
  currency?: string;
  showPricing?: boolean;
}

export interface ItineraryTransferCardProps {
  transfer_name: string;
  transfer_type: "SIC" | "Private" | "Car on Disposal";
  vehicle_type?: string;
  route?: string;
  passengers?: number;
  rate?: number;
  total?: number;
  currency?: string;
  showPricing?: boolean;
}

export interface ItineraryComboCardProps {
  combo_name: string;
  included_items: string[];
  participants?: number;
  rate_per_person?: number;
  total?: number;
  currency?: string;
  showPricing?: boolean;
}

export interface FreeActivityCardProps {
  time?: string;
  activity: string;
}

// =====================================================
// HOTEL CARD
// =====================================================

export function ItineraryHotelCard({
  hotel_name,
  star_rating,
  room_category,
  meal_plan,
  nights,
  rate_per_night,
  total,
  currency = "USD",
  showPricing = true,
}: ItineraryHotelCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4 border-l-blue-500",
        "bg-blue-50/30 dark:bg-blue-950/20",
        "hover:shadow-md transition-shadow"
      )}
    >
      <div className="flex">
        {/* Icon placeholder */}
        <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Hotel className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Content */}
        <div className="flex-1 p-2 md:p-3 flex flex-col justify-between min-w-0">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm truncate">{hotel_name}</h4>
                {star_rating && (
                  <div className="flex items-center gap-1 mt-0.5">
                    {Array.from({ length: parseInt(star_rating) || 0 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                )}
              </div>
              <Badge variant="secondary" className="flex-shrink-0 text-xs bg-blue-100 dark:bg-blue-900/50">
                {nights}N
              </Badge>
            </div>

            {/* Details */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">{room_category}</span>
              {meal_plan && (
                <span className="flex items-center gap-1">
                  <Utensils className="w-3 h-3" />
                  {meal_plan}
                </span>
              )}
            </div>
          </div>

          {/* Price */}
          {showPricing && total !== undefined && (
            <div className="flex items-end justify-between mt-1">
              {rate_per_night !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {currency} {rate_per_night.toLocaleString()}/night
                </span>
              )}
              <span className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                {currency} {total.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// TOUR CARD
// =====================================================

export function ItineraryTourCard({
  tour_name,
  package_name,
  duration,
  participants,
  rate_per_person,
  total,
  currency = "USD",
  showPricing = true,
}: ItineraryTourCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4 border-l-green-500",
        "bg-green-50/30 dark:bg-green-950/20",
        "hover:shadow-md transition-shadow"
      )}
    >
      <div className="flex">
        {/* Icon placeholder */}
        <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Compass className="w-6 h-6 md:w-8 md:h-8 text-green-600 dark:text-green-400" />
        </div>

        {/* Content */}
        <div className="flex-1 p-2 md:p-3 flex flex-col justify-between min-w-0">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm truncate">{tour_name}</h4>
                {package_name && package_name !== tour_name && (
                  <p className="text-xs text-muted-foreground truncate">{package_name}</p>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              {participants !== undefined && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {participants} pax
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {duration}
                </span>
              )}
            </div>
          </div>

          {/* Price */}
          {showPricing && total !== undefined && (
            <div className="flex items-end justify-between mt-1">
              {rate_per_person !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {currency} {rate_per_person.toLocaleString()}/person
                </span>
              )}
              <span className="font-semibold text-sm text-green-700 dark:text-green-400">
                {currency} {total.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// TRANSFER CARD
// =====================================================

export function ItineraryTransferCard({
  transfer_name,
  transfer_type,
  vehicle_type,
  route,
  passengers,
  rate,
  total,
  currency = "USD",
  showPricing = true,
}: ItineraryTransferCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4 border-l-orange-500",
        "bg-orange-50/30 dark:bg-orange-950/20",
        "hover:shadow-md transition-shadow"
      )}
    >
      <div className="flex">
        {/* Icon placeholder */}
        <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <Car className="w-6 h-6 md:w-8 md:h-8 text-orange-600 dark:text-orange-400" />
        </div>

        {/* Content */}
        <div className="flex-1 p-2 md:p-3 flex flex-col justify-between min-w-0">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm truncate">{transfer_name}</h4>
                {route && (
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {route}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className="flex-shrink-0 text-xs bg-orange-100 dark:bg-orange-900/50 border-orange-300"
              >
                {transfer_type}
              </Badge>
            </div>

            {/* Details */}
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              {passengers !== undefined && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {passengers} pax
                </span>
              )}
              {vehicle_type && <span>{vehicle_type}</span>}
            </div>
          </div>

          {/* Price */}
          {showPricing && total !== undefined && (
            <div className="flex items-end justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {transfer_type === "SIC" ? "per person" : "per vehicle"}
              </span>
              <span className="font-semibold text-sm text-orange-700 dark:text-orange-400">
                {currency} {total.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// COMBO CARD
// =====================================================

export function ItineraryComboCard({
  combo_name,
  included_items,
  participants,
  rate_per_person,
  total,
  currency = "USD",
  showPricing = true,
}: ItineraryComboCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4 border-l-purple-500",
        "bg-purple-50/30 dark:bg-purple-950/20",
        "hover:shadow-md transition-shadow"
      )}
    >
      <div className="flex">
        {/* Icon placeholder */}
        <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Package className="w-6 h-6 md:w-8 md:h-8 text-purple-600 dark:text-purple-400" />
        </div>

        {/* Content */}
        <div className="flex-1 p-2 md:p-3 flex flex-col justify-between min-w-0">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm truncate">{combo_name}</h4>
                <Badge variant="secondary" className="text-xs mt-1 bg-purple-100 dark:bg-purple-900/50">
                  Combo Package
                </Badge>
              </div>
            </div>

            {/* Included items */}
            {included_items.length > 0 && (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground truncate">
                  Includes: {included_items.slice(0, 2).join(", ")}
                  {included_items.length > 2 && ` +${included_items.length - 2} more`}
                </p>
              </div>
            )}

            {/* Details */}
            {participants !== undefined && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                {participants} pax
              </div>
            )}
          </div>

          {/* Price */}
          {showPricing && total !== undefined && (
            <div className="flex items-end justify-between mt-1">
              {rate_per_person !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {currency} {rate_per_person.toLocaleString()}/person
                </span>
              )}
              <span className="font-semibold text-sm text-purple-700 dark:text-purple-400">
                {currency} {total.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// FREE ACTIVITY CARD
// =====================================================

export function FreeActivityCard({ time, activity }: FreeActivityCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4 border-l-gray-300 dark:border-l-gray-600",
        "bg-gray-50/30 dark:bg-gray-900/20"
      )}
    >
      <div className="flex">
        {/* Icon placeholder */}
        <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-800/50 flex items-center justify-center">
          <Calendar className="w-6 h-6 md:w-8 md:h-8 text-gray-500 dark:text-gray-400" />
        </div>

        {/* Content */}
        <div className="flex-1 p-2 md:p-3 flex items-center min-w-0">
          <div>
            {time && <span className="text-xs text-muted-foreground mr-2">{time}</span>}
            <span className="text-sm">{activity}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// UNIFIED CARD RENDERER
// =====================================================

export type ItineraryCardType = "hotel" | "tour" | "transfer" | "combo" | "free";

export interface ItineraryCardData {
  type: ItineraryCardType;
  showPricing: boolean;
  currency?: string;
  hotelProps?: ItineraryHotelCardProps;
  tourProps?: ItineraryTourCardProps;
  transferProps?: ItineraryTransferCardProps;
  comboProps?: ItineraryComboCardProps;
  freeProps?: FreeActivityCardProps;
}

export function ItineraryServiceCard({ data }: { data: ItineraryCardData }) {
  const { type, showPricing, currency } = data;

  switch (type) {
    case "hotel":
      if (data.hotelProps) {
        return <ItineraryHotelCard {...data.hotelProps} showPricing={showPricing} currency={currency} />;
      }
      break;
    case "tour":
      if (data.tourProps) {
        return <ItineraryTourCard {...data.tourProps} showPricing={showPricing} currency={currency} />;
      }
      break;
    case "transfer":
      if (data.transferProps) {
        return <ItineraryTransferCard {...data.transferProps} showPricing={showPricing} currency={currency} />;
      }
      break;
    case "combo":
      if (data.comboProps) {
        return <ItineraryComboCard {...data.comboProps} showPricing={showPricing} currency={currency} />;
      }
      break;
    case "free":
      if (data.freeProps) {
        return <FreeActivityCard {...data.freeProps} />;
      }
      break;
  }

  return null;
}

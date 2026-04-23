"use client";

import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { DayActivitiesCarousel } from "./day-activities-carousel";
import type { ServiceCardV2Data } from "./service-card-v2";
import type {
  EnhancedItineraryDayData,
  EnhancedItineraryActivity,
  PricingBreakupRule,
} from "@/lib/agents/ui-components";
import { cn } from "@/lib/utils";

// =====================================================
// LEGACY TYPES (for backward compatibility)
// =====================================================

export interface ItineraryActivity {
  time: string;
  title: string;
  description: string;
  location?: string;
  duration?: string;
}

export interface ItineraryDayData {
  day: number;
  title: string;
  activities: ItineraryActivity[];
}

// =====================================================
// COMPONENT PROPS
// =====================================================

interface ItineraryViewerProps {
  // Can accept either legacy format or enhanced format
  days: ItineraryDayData[] | EnhancedItineraryDayData[];
  // Optional props for enhanced mode
  pricingBreakupRule?: PricingBreakupRule;
  currency?: string;
  className?: string;
}

// =====================================================
// TYPE GUARDS
// =====================================================

function isEnhancedDay(day: ItineraryDayData | EnhancedItineraryDayData): day is EnhancedItineraryDayData {
  if (!day.activities || day.activities.length === 0) return false;
  const firstActivity = day.activities[0] as any;
  return "package_type" in firstActivity || "cardData" in firstActivity;
}

// =====================================================
// ACTIVITY TO CARD MAPPER
// =====================================================

function mapActivityToCardData(
  activity: EnhancedItineraryActivity,
  showPricing: boolean,
  currency: string
): ServiceCardV2Data {
  const type = activity.package_type || "tour";

  switch (type) {
    case "hotel":
      return {
        type: "hotel",
        id: activity.id || `hotel-${activity.activity}`,
        name: (activity as any).hotel_name || activity.package_name || activity.activity,
        subtitle: (activity as any).room_category,
        location: (activity as any).location,
        rating: (activity as any).rating,
        review_count: (activity as any).review_count,
        image_url: (activity as any).image_url,
        price: showPricing ? activity.pricing?.subtotal : undefined,
        currency,
        showPricing,
        room_type: (activity as any).room_category,
        meal_plan: (activity as any).meal_plan,
      };

    case "tour":
      return {
        type: "tour",
        id: activity.id || `tour-${activity.activity}`,
        name: activity.activity || activity.package_name || "Tour",
        subtitle: activity.package_name,
        description: (activity as any).description,
        location: (activity as any).location,
        rating: (activity as any).rating,
        review_count: (activity as any).review_count,
        image_url: (activity as any).image_url,
        price: showPricing ? activity.pricing?.subtotal : undefined,
        currency,
        showPricing,
        duration: activity.time,
        participants: (activity as any).quantity?.total_eligible || (activity as any).quantity?.adults,
      };

    case "transfer":
      return {
        type: "transfer",
        id: activity.id || `transfer-${activity.activity}`,
        name: activity.activity || activity.package_name || "Transfer",
        subtitle: (activity as any).service_context || (activity as any).basis || "Private",
        location: (activity as any).zone || (activity as any).area,
        image_url: (activity as any).image_url,
        price: showPricing ? activity.pricing?.subtotal : undefined,
        currency,
        showPricing,
        transfer_type: (activity as any).basis,
        service_context: (activity as any).service_context,
        vehicle: (activity as any).vehicle_type,
        participants: (activity as any).quantity?.total_passengers,
      };

    case "combo":
      return {
        type: "combo",
        id: activity.id || `combo-${activity.activity}`,
        name: activity.activity || activity.package_name || "Combo Package",
        subtitle: `${((activity as any).requested_items || []).length} services included`,
        image_url: (activity as any).image_url,
        price: showPricing ? activity.pricing?.subtotal : undefined,
        currency,
        showPricing,
        participants: (activity as any).quantity?.total_eligible,
      };

    case "meal":
      return {
        type: "meal",
        id: activity.id || `meal-${activity.activity}`,
        name: activity.activity || "Meal",
        subtitle: (activity as any).meal_type,
        image_url: (activity as any).image_url,
        price: showPricing ? activity.pricing?.subtotal : undefined,
        currency,
        showPricing,
      };

    default:
      return {
        type: "tour",
        id: activity.id || `activity-${activity.activity}`,
        name: activity.activity || "Activity",
        subtitle: activity.time,
        showPricing: false,
      };
  }
}

function mapLegacyActivityToCardData(activity: ItineraryActivity): ServiceCardV2Data {
  return {
    type: "tour",
    id: `legacy-${activity.title}`,
    name: activity.title,
    subtitle: activity.time,
    description: activity.description,
    location: activity.location,
    duration: activity.duration,
    showPricing: false,
  };
}

// =====================================================
// DAY SECTION COMPONENT
// =====================================================

interface DaySectionProps {
  day: ItineraryDayData | EnhancedItineraryDayData;
  pricingBreakupRule: PricingBreakupRule;
  currency: string;
  isLast?: boolean;
}

function DaySection({ day, pricingBreakupRule, currency, isLast }: DaySectionProps) {
  const isEnhanced = isEnhancedDay(day);
  const showPricing = pricingBreakupRule === "item_breakup";

  // Convert activities to card data
  const cardActivities: ServiceCardV2Data[] = day.activities.map((activity) => {
    if (isEnhanced) {
      return mapActivityToCardData(activity as EnhancedItineraryActivity, showPricing, currency);
    }
    return mapLegacyActivityToCardData(activity as ItineraryActivity);
  });

  return (
    <div className={cn("relative", !isLast && "pb-4")}>
      {/* Day Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Day {day.day}</h3>
          <p className="text-sm text-muted-foreground">{day.title}</p>
          {isEnhanced && (day as EnhancedItineraryDayData).date && (
            <p className="text-xs text-muted-foreground">
              {(day as EnhancedItineraryDayData).date}
            </p>
          )}
        </div>
      </div>

      {/* Horizontal Card Carousel */}
      <div className="pl-2">
        <DayActivitiesCarousel
          activities={cardActivities}
          showPricing={showPricing}
          currency={currency}
        />
      </div>

      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute left-5 top-14 bottom-0 w-px bg-border" />
      )}
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ItineraryViewer({
  days,
  pricingBreakupRule = "item_breakup",
  currency = "USD",
  className,
}: ItineraryViewerProps) {
  if (!days || days.length === 0) {
    return null;
  }

  return (
    <Card className={cn("p-4 shadow-sm", className)}>
      <div className="space-y-2">
        {days.map((day, index) => (
          <DaySection
            key={day.day}
            day={day}
            pricingBreakupRule={pricingBreakupRule}
            currency={currency}
            isLast={index === days.length - 1}
          />
        ))}
      </div>
    </Card>
  );
}

// Re-export types for convenience
export type { ItineraryDayData, EnhancedItineraryDayData, EnhancedItineraryActivity };

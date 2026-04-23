/**
 * Itinerary Activity to Card Data Mapper
 *
 * Transforms ItineraryActivity from the pipeline OR simple itinerary format
 * into card-ready data for the generative UI components.
 *
 * Handles two different itinerary formats:
 * 1. Pipeline format: Has package_type, package_name, pricing, etc.
 * 2. Simple format: Has activity, package (string), hotelRoom
 */

import type { ItineraryActivity, ItineraryDay, PackageType } from "@/lib/agents/itinerary-pipeline/types";
import type { ItineraryCardData } from "@/app/(root)/playground/components/ui/itinerary-service-cards";

// Simple itinerary format from query-classification.ts
interface SimpleActivity {
  time?: string;
  activity: string;
  package?: string;
  hotelRoom?: string;
  duration?: string;
  notes?: string;
}

interface SimpleItineraryDay {
  day: number;
  date?: string;
  activities: SimpleActivity[];
}

// Union type for any itinerary day format
type AnyItineraryDay = ItineraryDay | SimpleItineraryDay;
type AnyActivity = ItineraryActivity | SimpleActivity;

// =====================================================
// PRICING BREAKUP RULE
// =====================================================

export type PricingBreakupRule = "total_gross" | "category_breakup" | "item_breakup";

/**
 * Determines if pricing should be shown based on DMC policy
 */
function shouldShowPricing(rule: PricingBreakupRule): boolean {
  switch (rule) {
    case "item_breakup":
      return true; // Show price on each card
    case "category_breakup":
      return false; // Show only category totals, not individual
    case "total_gross":
      return false; // Show only grand total
    default:
      return true;
  }
}

/**
 * Detect if activity is from pipeline (rich format) or simple format
 */
function isPipelineActivity(activity: AnyActivity): activity is ItineraryActivity {
  return "package_type" in activity || "status" in activity;
}

/**
 * Infer package type from simple activity text
 */
function inferPackageType(activity: SimpleActivity): PackageType {
  const text = (activity.activity + " " + (activity.package || "")).toLowerCase();

  // Hotel keywords
  if (activity.hotelRoom || text.includes("check-in") || text.includes("check in") || text.includes("overnight")) {
    return "hotel";
  }

  // Transfer keywords
  if (
    text.includes("transfer") ||
    text.includes("airport") ||
    text.includes("pick up") ||
    text.includes("drop off") ||
    text.includes("→")
  ) {
    return "transfer";
  }

  // Tour keywords (default for most activities)
  if (
    text.includes("tour") ||
    text.includes("visit") ||
    text.includes("excursion") ||
    text.includes("park") ||
    text.includes("activity") ||
    text.includes("zipline") ||
    text.includes("bridge") ||
    text.includes("adventure")
  ) {
    return "tour";
  }

  // Combo keywords
  if (text.includes("combo") || text.includes("package")) {
    return "combo";
  }

  // Free time / leisure
  if (text.includes("free") || text.includes("leisure") || text.includes("at leisure")) {
    return "free";
  }

  // Default to tour for activity-like items
  return "tour";
}

// =====================================================
// MAIN MAPPER FUNCTION
// =====================================================

/**
 * Maps a simple activity to card-ready data
 */
function mapSimpleActivityToCardData(
  activity: SimpleActivity,
  pricingBreakupRule: PricingBreakupRule = "item_breakup",
  currency: string = "USD"
): ItineraryCardData {
  const showPricing = shouldShowPricing(pricingBreakupRule);
  const type = inferPackageType(activity);

  const baseData: ItineraryCardData = {
    type,
    showPricing,
    currency,
  };

  switch (type) {
    case "hotel":
      return {
        ...baseData,
        hotelProps: {
          hotel_name: activity.hotelRoom?.split(" - ")[0] || "Hotel",
          room_category: activity.hotelRoom?.split(" - ")[1] || "Standard Room",
          meal_plan: undefined,
          nights: 1,
          rate_per_night: undefined,
          total: undefined,
          currency,
        },
      };

    case "tour":
      return {
        ...baseData,
        tourProps: {
          tour_name: activity.activity || "Tour",
          package_name: activity.package,
          duration: activity.duration,
          participants: undefined,
          rate_per_person: undefined,
          total: undefined,
          currency,
        },
      };

    case "transfer":
      return {
        ...baseData,
        transferProps: {
          transfer_name: activity.activity || "Transfer",
          transfer_type: activity.package?.toLowerCase().includes("pvt") ? "Private" : "SIC",
          vehicle_type: undefined,
          route: activity.package,
          passengers: undefined,
          rate: undefined,
          total: undefined,
          currency,
        },
      };

    case "combo":
      return {
        ...baseData,
        comboProps: {
          combo_name: activity.activity || "Combo Package",
          included_items: [],
          participants: undefined,
          rate_per_person: undefined,
          total: undefined,
          currency,
        },
      };

    case "free":
    default:
      return {
        ...baseData,
        type: "free",
        freeProps: {
          time: activity.time,
          activity: activity.activity || "Free time",
        },
      };
  }
}

/**
 * Maps an ItineraryActivity (pipeline format) to card-ready data
 */
function mapPipelineActivityToCardData(
  activity: ItineraryActivity,
  pricingBreakupRule: PricingBreakupRule = "item_breakup",
  currency: string = "USD"
): ItineraryCardData {
  const showPricing = shouldShowPricing(pricingBreakupRule);
  const type = activity.package_type || "free";

  const baseData: ItineraryCardData = {
    type: type as ItineraryCardData["type"],
    showPricing,
    currency,
  };

  switch (type) {
    case "hotel":
      return {
        ...baseData,
        hotelProps: {
          hotel_name: activity.hotel_name || activity.package_name || activity.activity,
          star_rating: undefined,
          room_category: activity.room_category || "Standard Room",
          meal_plan: activity.meal_plan,
          nights: activity.quantity?.rooms || 1,
          rate_per_night: activity.pricing?.unit_rate,
          total: activity.pricing?.subtotal,
          currency,
        },
      };

    case "tour":
      return {
        ...baseData,
        tourProps: {
          tour_name: activity.activity || activity.package_name || "Tour",
          package_name: activity.package_name,
          duration: undefined,
          participants: activity.quantity?.total_eligible || activity.quantity?.adults,
          rate_per_person: activity.pricing?.unit_rate,
          total: activity.pricing?.subtotal,
          currency,
        },
      };

    case "transfer":
      return {
        ...baseData,
        transferProps: {
          transfer_name: activity.activity || activity.package_name || "Transfer",
          transfer_type: activity.basis || (activity.is_car_on_disposal ? "Car on Disposal" : "Private"),
          vehicle_type: activity.vehicle_type,
          route: activity.zone || activity.area,
          passengers: activity.quantity?.total_passengers || activity.quantity?.adults,
          rate: activity.pricing?.unit_rate,
          total: activity.pricing?.subtotal,
          currency,
        },
      };

    case "combo":
      return {
        ...baseData,
        comboProps: {
          combo_name: activity.activity || activity.package_name || "Combo Package",
          included_items: activity.requested_items || [],
          participants: activity.quantity?.total_eligible || activity.quantity?.adults,
          rate_per_person: activity.pricing?.unit_rate,
          total: activity.pricing?.subtotal,
          currency,
        },
      };

    case "free":
    default:
      return {
        ...baseData,
        type: "free",
        freeProps: {
          time: activity.time,
          activity: activity.activity || "Free time",
        },
      };
  }
}

/**
 * Maps any activity format to card-ready data
 *
 * @param activity - The activity (pipeline or simple format)
 * @param pricingBreakupRule - DMC pricing display rule
 * @param currency - Currency code (e.g., "USD", "EUR")
 * @returns Card data ready for rendering
 */
export function mapActivityToCardData(
  activity: AnyActivity,
  pricingBreakupRule: PricingBreakupRule = "item_breakup",
  currency: string = "USD"
): ItineraryCardData {
  if (isPipelineActivity(activity)) {
    return mapPipelineActivityToCardData(activity, pricingBreakupRule, currency);
  }
  return mapSimpleActivityToCardData(activity, pricingBreakupRule, currency);
}

// =====================================================
// BATCH MAPPER FOR FULL ITINERARY
// =====================================================

export interface EnhancedItineraryActivity {
  time: string;
  activity: string;
  package_name?: string;
  package_type: PackageType;
  cardData: ItineraryCardData;
  // Optional fields from pipeline
  pricing?: {
    subtotal?: number;
    unit_rate?: number;
  };
}

export interface EnhancedItineraryDay {
  day: number;
  date?: string;
  title: string;
  activities: EnhancedItineraryActivity[];
}

/**
 * Check if day is from pipeline format
 */
function isPipelineDay(day: AnyItineraryDay): day is ItineraryDay {
  return "title" in day;
}

/**
 * Maps all activities in an itinerary day to card data
 * Handles both pipeline and simple formats
 */
export function mapDayActivitiesToCards(
  day: AnyItineraryDay,
  pricingBreakupRule: PricingBreakupRule = "item_breakup",
  currency: string = "USD"
): EnhancedItineraryDay {
  const title = isPipelineDay(day) ? day.title : `Day ${day.day}`;

  return {
    day: day.day,
    date: day.date,
    title,
    activities: day.activities.map((activity) => {
      const cardData = mapActivityToCardData(activity, pricingBreakupRule, currency);

      // Build enhanced activity
      if (isPipelineActivity(activity)) {
        return {
          time: activity.time || "",
          activity: activity.activity,
          package_name: activity.package_name,
          package_type: activity.package_type || "free",
          cardData,
          pricing: activity.pricing
            ? {
                subtotal: activity.pricing.subtotal,
                unit_rate: activity.pricing.unit_rate,
              }
            : undefined,
        };
      }

      // Simple activity format
      return {
        time: activity.time || "",
        activity: activity.activity,
        package_name: activity.package,
        package_type: cardData.type,
        cardData,
      };
    }),
  };
}

/**
 * Maps all days in an itinerary to enhanced format with card data
 * Handles both pipeline and simple itinerary formats
 */
export function mapItineraryToEnhanced(
  days: AnyItineraryDay[],
  pricingBreakupRule: PricingBreakupRule = "item_breakup",
  currency: string = "USD"
): EnhancedItineraryDay[] {
  return days.map((day) => mapDayActivitiesToCards(day, pricingBreakupRule, currency));
}

// =====================================================
// LEGACY SUPPORT - Convert simple itinerary format
// =====================================================

export interface LegacyItineraryActivity {
  time: string;
  title: string;
  description: string;
  location?: string;
  duration?: string;
}

export interface LegacyItineraryDay {
  day: number;
  title: string;
  activities: LegacyItineraryActivity[];
}

/**
 * Converts legacy simple itinerary format to enhanced format
 * Used for backward compatibility with existing itineraries
 */
export function convertLegacyToEnhanced(
  days: LegacyItineraryDay[],
  _pricingBreakupRule: PricingBreakupRule = "item_breakup",
  _currency: string = "USD"
): EnhancedItineraryDay[] {
  return days.map((day) => ({
    day: day.day,
    date: undefined,
    title: day.title,
    activities: day.activities.map((activity) => ({
      time: activity.time,
      activity: activity.title,
      package_name: activity.title,
      package_type: "free" as PackageType, // Default to free for legacy
      status: "priced" as const,
      cardData: {
        type: "free" as const,
        showPricing: false,
        freeProps: {
          time: activity.time,
          activity: `${activity.title}${activity.description ? ` - ${activity.description}` : ""}`,
        },
      },
    })),
  }));
}

/**
 * Detects if itinerary data is in enhanced format
 */
export function isEnhancedItinerary(
  days: (EnhancedItineraryDay | LegacyItineraryDay)[]
): days is EnhancedItineraryDay[] {
  if (!days || days.length === 0) return false;
  const firstDay = days[0];
  if (!firstDay.activities || firstDay.activities.length === 0) return false;

  // Enhanced format has package_type and cardData
  const firstActivity = firstDay.activities[0] as any;
  return "package_type" in firstActivity || "cardData" in firstActivity;
}

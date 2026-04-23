/**
 * Trip Highlights Extractor
 *
 * Extracts activity data from itinerary to display as visual cards
 * in the Trip Highlights section.
 */

import type { ActivityCardData } from "@/app/(root)/playground/components/ui/activity-card";

interface ItineraryActivity {
  time?: string;
  activity: string;
  package_type?: string;
  package_name?: string;
  tour_id?: string;
  hotel_id?: string;
  transfer_id?: string;
  image_url?: string;
  rating?: number;
  pricing?: {
    subtotal?: number;
    unit_rate?: number;
  };
  hotel_name?: string;
  room_category?: string;
  meal_plan?: string;
  transfer_type?: string;
  vehicle_type?: string;
  zone?: string;
  duration?: string;
  quantity?: {
    adults?: number;
    total_eligible?: number;
  };
}

interface ItineraryDay {
  day: number;
  title?: string;
  date?: string;
  activities: ItineraryActivity[];
}

interface Itinerary {
  days: ItineraryDay[];
  destination?: string;
}

/**
 * Extract activities from itinerary as card data for Trip Highlights
 *
 * Filters out:
 * - Free activities
 * - Duplicate services (same name)
 *
 * Groups by type for better organization
 */
export function extractTripHighlights(
  itinerary: Itinerary | null,
  showPricing: boolean = true,
  currency: string = "USD"
): ActivityCardData[] {
  if (!itinerary?.days?.length) {
    return [];
  }

  const activities: ActivityCardData[] = [];
  const seen = new Set<string>();

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      // Skip free activities
      if (!activity.package_type || activity.package_type === "free") {
        continue;
      }

      // ✅ FIX: Skip transfers - they're already shown in day cards
      // Prevents duplicate transfer cards appearing after disclaimer
      if (activity.package_type === "transfer") {
        continue;
      }

      // Skip duplicates (same name)
      const key = activity.activity.toLowerCase().trim();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      // Build card data
      const cardData: ActivityCardData = {
        type: activity.package_type as ActivityCardData["type"],
        id: activity.tour_id || activity.hotel_id || activity.transfer_id,
        name: activity.activity,
        subtitle: activity.package_name,
        image_url: activity.image_url,
        price: showPricing ? activity.pricing?.subtotal : undefined,
        currency,
        showPricing,
        date: day.date,
      };

      // Add type-specific fields
      switch (activity.package_type) {
        case "tour":
          cardData.participants = activity.quantity?.total_eligible || activity.quantity?.adults;
          cardData.duration = activity.duration;
          cardData.location = itinerary.destination;
          break;

        case "hotel":
          cardData.name = activity.hotel_name || activity.activity;
          cardData.room_type = activity.room_category;
          cardData.meal_plan = activity.meal_plan;
          break;

        case "transfer":
          cardData.transfer_type = activity.transfer_type;
          cardData.vehicle = activity.vehicle_type;
          cardData.location = activity.zone;
          break;

        case "combo":
          cardData.participants = activity.quantity?.total_eligible;
          break;
      }

      activities.push(cardData);
    }
  }

  // Sort: tours first, then hotels, then transfers, then combos
  const typeOrder = { tour: 0, hotel: 1, transfer: 2, combo: 3 };
  activities.sort((a, b) => {
    const orderA = typeOrder[a.type] ?? 99;
    const orderB = typeOrder[b.type] ?? 99;
    return orderA - orderB;
  });

  return activities;
}

/**
 * Create a UIMessage for trip highlights
 */
export function createTripHighlightsUIMessage(
  itinerary: Itinerary | null,
  showPricing: boolean = true,
  currency: string = "USD"
): {
  id: string;
  name: "trip-highlights";
  props: {
    activities: ActivityCardData[];
    showPricing: boolean;
    currency: string;
  };
} | null {
  const activities = extractTripHighlights(itinerary, showPricing, currency);

  if (activities.length === 0) {
    return null;
  }

  return {
    id: `trip-highlights-${Date.now()}`,
    name: "trip-highlights",
    props: {
      activities,
      showPricing,
      currency,
    },
  };
}

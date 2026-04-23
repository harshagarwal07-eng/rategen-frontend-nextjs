/**
 * Inline Card Injector
 *
 * Post-processes formatted responses to inject SERVICE_CARD markers
 * at appropriate positions within the markdown content.
 *
 * This allows cards to appear inline with text where services are mentioned,
 * rather than being rendered separately.
 */

import type { ServiceCardData } from "@/app/(root)/playground/components/ui/service-card";

interface ServiceInfo {
  id?: string;
  name: string;
  type: "tour" | "hotel" | "transfer" | "combo";
  image_url?: string;
  rating?: number;
  price?: number;
  price_label?: string;
  // Additional details
  subtitle?: string;
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

interface ItineraryDay {
  day: number;
  title?: string;
  date?: string;
  activities: Array<{
    time?: string;
    activity: string;
    package_type?: string;
    package_name?: string;
    // From DB
    tour_id?: string;
    hotel_id?: string;
    transfer_id?: string;
    image_url?: string;
    rating?: number;
    // Pricing
    pricing?: {
      subtotal?: number;
      unit_rate?: number;
    };
    // Hotel specific
    hotel_name?: string;
    room_category?: string;
    meal_plan?: string;
    // Transfer specific
    transfer_type?: string;
    vehicle_type?: string;
    zone?: string;
    // Tour specific
    duration?: string;
    quantity?: {
      adults?: number;
      total_eligible?: number;
    };
  }>;
}

/**
 * Create SERVICE_CARD marker from service info
 */
function createCardMarker(service: ServiceInfo, showPricing: boolean, currency: string): string {
  const cardData: ServiceCardData = {
    type: service.type,
    id: service.id,
    name: service.name,
    subtitle: service.subtitle,
    image_url: service.image_url,
    rating: service.rating,
    price: showPricing ? service.price : undefined,
    price_label: service.price_label,
    currency,
    showPricing,
    duration: service.duration,
    participants: service.participants,
    location: service.location,
    room_type: service.room_type,
    meal_plan: service.meal_plan,
    nights: service.nights,
    transfer_type: service.transfer_type,
    vehicle: service.vehicle,
    route: service.route,
  };

  // Remove undefined fields
  const cleanData = JSON.parse(
    JSON.stringify(cardData, (_, v) => (v === undefined ? undefined : v))
  );

  return `<!-- SERVICE_CARD:${JSON.stringify(cleanData)} -->`;
}

/**
 * Extract service info from itinerary activity
 */
function activityToServiceInfo(activity: ItineraryDay["activities"][0]): ServiceInfo | null {
  const type = activity.package_type as ServiceInfo["type"];
  if (!type || type === "free") return null;

  const baseInfo: ServiceInfo = {
    type,
    name: activity.activity || activity.package_name || "Unknown",
    image_url: activity.image_url,
    rating: activity.rating,
    price: activity.pricing?.subtotal,
  };

  switch (type) {
    case "tour":
      return {
        ...baseInfo,
        id: activity.tour_id,
        subtitle: activity.package_name,
        duration: activity.duration,
        participants: activity.quantity?.total_eligible || activity.quantity?.adults,
        price_label: "total",
      };

    case "hotel":
      return {
        ...baseInfo,
        id: activity.hotel_id,
        name: activity.hotel_name || activity.activity,
        room_type: activity.room_category,
        meal_plan: activity.meal_plan,
        price_label: "total",
      };

    case "transfer":
      return {
        ...baseInfo,
        id: activity.transfer_id,
        transfer_type: activity.transfer_type,
        vehicle: activity.vehicle_type,
        route: activity.zone,
        price_label: "total",
      };

    case "combo":
      return {
        ...baseInfo,
        subtitle: "Combo Package",
        participants: activity.quantity?.total_eligible,
        price_label: "total",
      };

    default:
      return baseInfo;
  }
}

/**
 * Inject SERVICE_CARD markers into formatted response
 *
 * Strategy:
 * 1. For each service in the itinerary, create a card marker
 * 2. Find where the service is mentioned in the text and inject card after
 * 3. If service isn't mentioned, inject at appropriate day section
 */
export function injectServiceCards(
  content: string,
  itinerary: { days: ItineraryDay[] } | null,
  showPricing: boolean = true,
  currency: string = "USD"
): string {
  if (!itinerary?.days?.length) {
    return content;
  }

  let result = content;
  const injectedServices = new Set<string>();

  // Process each day
  for (const day of itinerary.days) {
    // Find day header pattern in content (e.g., "**Day 1:", "## Day 1", "Day 1:")
    const dayPattern = new RegExp(
      `(\\*{0,2}Day\\s*${day.day}[:\\s][^\\n]*\\n)`,
      "i"
    );
    const dayMatch = result.match(dayPattern);

    // Collect cards for this day
    const dayCards: string[] = [];

    for (const activity of day.activities) {
      const serviceInfo = activityToServiceInfo(activity);
      if (!serviceInfo) continue;

      // Create unique key to avoid duplicates
      const serviceKey = `${serviceInfo.type}:${serviceInfo.name}`;
      if (injectedServices.has(serviceKey)) continue;
      injectedServices.add(serviceKey);

      const cardMarker = createCardMarker(serviceInfo, showPricing, currency);

      // Try to find service mentioned in text and inject after
      const serviceName = serviceInfo.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const servicePattern = new RegExp(
        `(\\*{0,2}${serviceName}\\*{0,2}[^\\n]*\\n)`,
        "i"
      );
      const serviceMatch = result.match(servicePattern);

      if (serviceMatch && serviceMatch.index !== undefined) {
        // Inject card after the line mentioning this service
        const insertPos = serviceMatch.index + serviceMatch[0].length;
        result =
          result.slice(0, insertPos) +
          "\n" +
          cardMarker +
          "\n" +
          result.slice(insertPos);
      } else {
        // Collect for day-level injection
        dayCards.push(cardMarker);
      }
    }

    // If we have cards that weren't matched to specific text, inject after day header
    if (dayCards.length > 0 && dayMatch && dayMatch.index !== undefined) {
      const insertPos = dayMatch.index + dayMatch[0].length;
      result =
        result.slice(0, insertPos) +
        "\n" +
        dayCards.join("\n") +
        "\n" +
        result.slice(insertPos);
    }
  }

  return result;
}

/**
 * Build cards data directly from itinerary without injection
 * Use when you want to pass card data separately rather than embedded in markdown
 */
export function extractServiceCardsFromItinerary(
  itinerary: { days: ItineraryDay[] } | null,
  showPricing: boolean = true,
  currency: string = "USD"
): ServiceCardData[] {
  if (!itinerary?.days?.length) {
    return [];
  }

  const cards: ServiceCardData[] = [];
  const seen = new Set<string>();

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      const serviceInfo = activityToServiceInfo(activity);
      if (!serviceInfo) continue;

      const key = `${serviceInfo.type}:${serviceInfo.name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      cards.push({
        type: serviceInfo.type,
        id: serviceInfo.id,
        name: serviceInfo.name,
        subtitle: serviceInfo.subtitle,
        image_url: serviceInfo.image_url,
        rating: serviceInfo.rating,
        price: showPricing ? serviceInfo.price : undefined,
        price_label: serviceInfo.price_label,
        currency,
        showPricing,
        duration: serviceInfo.duration,
        participants: serviceInfo.participants,
        location: serviceInfo.location,
        room_type: serviceInfo.room_type,
        meal_plan: serviceInfo.meal_plan,
        nights: serviceInfo.nights,
        transfer_type: serviceInfo.transfer_type,
        vehicle: serviceInfo.vehicle,
        route: serviceInfo.route,
      });
    }
  }

  return cards;
}

export type { ServiceInfo, ItineraryDay };

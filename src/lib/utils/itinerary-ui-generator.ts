/**
 * Itinerary UI Generator
 *
 * Generates structured UI messages for:
 * 1. Itinerary day carousels
 * 2. Service summary tables with hover cards
 */

import type { UIMessage } from "@/types/chat";

// =====================================================
// INTERFACES
// =====================================================

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
  review_count?: number;
  location?: string;
  description?: string;
  pricing?: {
    subtotal?: number;
    unit_rate?: number;
  };
  hotel_name?: string;
  room_category?: string;
  meal_plan?: string;
  stars?: number;
  transfer_type?: string;
  basis?: string;
  vehicle_type?: string;
  zone?: string;
  area?: string;
  duration?: string;
  service_context?: string; // e.g., "From Hotel to Global Village"
  quantity?: {
    adults?: number;
    children?: number;
    total_eligible?: number;
    total_passengers?: number;
    rooms?: number;
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

// =====================================================
// TYPE DEFINITIONS FOR UI MESSAGES
// =====================================================

export interface ItineraryViewerUIProps {
  days: Array<{
    day: number;
    title: string;
    date?: string;
    activities: Array<{
      id?: string;
      time?: string;
      activity: string;
      package_type: string;
      package_name?: string;
      image_url?: string;
      rating?: number;
      review_count?: number;
      location?: string;
      description?: string;
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
      service_context?: string;
      quantity?: {
        adults?: number;
        total_eligible?: number;
        total_passengers?: number;
      };
    }>;
  }>;
  pricingBreakupRule: string;
  currency: string;
}

export interface TourSummaryUIProps {
  tours: Array<{
    tour_name: string;
    package_name?: string;
    participants?: number;
    unit_price?: number;
    total?: number;
    duration?: string;
    image_url?: string;
    rating?: number;
    review_count?: number;
    location?: string;
    description?: string;
  }>;
  currency: string;
  showPricing: boolean;
}

export interface TransferSummaryUIProps {
  transfers: Array<{
    transfer_name: string;
    transfer_type?: string;
    vehicle?: string;
    route?: string;
    passengers?: number;
    unit_price?: number;
    total?: number;
    image_url?: string;
  }>;
  currency: string;
  showPricing: boolean;
}

export interface HotelSummaryUIProps {
  hotels: Array<{
    hotel_name: string;
    room_type?: string;
    meal_plan?: string;
    nights?: number;
    rate_per_night?: number;
    total?: number;
    stars?: number;
    image_url?: string;
    location?: string;
    rating?: number;
    review_count?: number;
  }>;
  currency: string;
  showPricing: boolean;
}

export interface MealSummaryUIProps {
  meals: Array<{
    meal_name: string;
    meal_type?: string;
    participants?: number;
    unit_price?: number;
    total?: number;
    image_url?: string;
    location?: string;
  }>;
  currency: string;
  showPricing: boolean;
}

// =====================================================
// ITINERARY VIEWER GENERATOR
// =====================================================

/**
 * Create itinerary-viewer UI message with day carousels
 */
export function createItineraryViewerUI(
  itinerary: Itinerary | null,
  pricingBreakupRule: string,
  currency: string
): UIMessage | null {
  if (!itinerary?.days?.length) {
    return null;
  }

  const days = itinerary.days.map((day) => ({
    day: day.day,
    title: day.title || `Day ${day.day}`,
    date: day.date,
    activities: day.activities.map((activity) => ({
      id: activity.tour_id || activity.hotel_id || activity.transfer_id,
      time: activity.time,
      activity: activity.activity,
      package_type: activity.package_type || "tour",
      package_name: activity.package_name,
      image_url: activity.image_url,
      rating: activity.rating,
      review_count: activity.review_count,
      location: activity.location || itinerary.destination,
      description: activity.description,
      pricing: activity.pricing,
      hotel_name: activity.hotel_name,
      room_category: activity.room_category,
      meal_plan: activity.meal_plan,
      transfer_type: activity.transfer_type || activity.basis,
      vehicle_type: activity.vehicle_type,
      zone: activity.zone || activity.area,
      duration: activity.duration,
      service_context: activity.service_context,
      quantity: activity.quantity,
    })),
  }));

  return {
    id: `itinerary-viewer-${Date.now()}`,
    name: "itinerary-viewer",
    props: {
      days,
      pricingBreakupRule,
      currency,
    },
  };
}

// =====================================================
// SUMMARY TABLE GENERATORS
// =====================================================

/**
 * Extract unique tours from itinerary for summary table
 */
export function createToursSummaryUI(
  itinerary: Itinerary | null,
  showPricing: boolean,
  currency: string
): UIMessage | null {
  if (!itinerary?.days?.length) {
    return null;
  }

  const seen = new Set<string>();
  const tours: TourSummaryUIProps["tours"] = [];

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      if (activity.package_type !== "tour") continue;

      const key = activity.activity.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      tours.push({
        tour_name: activity.activity,
        package_name: activity.package_name,
        participants: activity.quantity?.total_eligible || activity.quantity?.adults,
        unit_price: activity.pricing?.unit_rate,
        total: activity.pricing?.subtotal,
        duration: activity.duration,
        image_url: activity.image_url,
        rating: activity.rating,
        review_count: activity.review_count,
        location: activity.location,
        description: activity.description,
      });
    }
  }

  if (tours.length === 0) {
    return null;
  }

  return {
    id: `tours-summary-${Date.now()}`,
    name: "tours-summary",
    props: {
      tours,
      currency,
      showPricing,
    },
  };
}

/**
 * Extract unique transfers from itinerary for summary table
 */
export function createTransfersSummaryUI(
  itinerary: Itinerary | null,
  showPricing: boolean,
  currency: string
): UIMessage | null {
  if (!itinerary?.days?.length) {
    return null;
  }

  const seen = new Set<string>();
  const transfers: TransferSummaryUIProps["transfers"] = [];

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      if (activity.package_type !== "transfer") continue;

      const key = activity.activity.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      transfers.push({
        transfer_name: activity.activity,
        transfer_type: activity.transfer_type || activity.basis,
        vehicle: activity.vehicle_type,
        route: activity.zone || activity.area,
        passengers: activity.quantity?.total_passengers || activity.quantity?.adults,
        unit_price: activity.pricing?.unit_rate,
        total: activity.pricing?.subtotal,
        image_url: activity.image_url,
      });
    }
  }

  if (transfers.length === 0) {
    return null;
  }

  return {
    id: `transfers-summary-${Date.now()}`,
    name: "transfers-summary",
    props: {
      transfers,
      currency,
      showPricing,
    },
  };
}

/**
 * Extract unique hotels from itinerary for summary table
 */
export function createHotelsSummaryUI(
  itinerary: Itinerary | null,
  showPricing: boolean,
  currency: string
): UIMessage | null {
  if (!itinerary?.days?.length) {
    return null;
  }

  const seen = new Set<string>();
  const hotels: HotelSummaryUIProps["hotels"] = [];

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      if (activity.package_type !== "hotel") continue;

      const hotelName = activity.hotel_name || activity.activity;
      const key = hotelName.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      hotels.push({
        hotel_name: hotelName,
        room_type: activity.room_category,
        meal_plan: activity.meal_plan,
        nights: activity.quantity?.rooms || 1,
        rate_per_night: activity.pricing?.unit_rate,
        total: activity.pricing?.subtotal,
        stars: activity.stars,
        image_url: activity.image_url,
        location: activity.location,
        rating: activity.rating,
        review_count: activity.review_count,
      });
    }
  }

  if (hotels.length === 0) {
    return null;
  }

  return {
    id: `hotels-summary-${Date.now()}`,
    name: "hotels-summary",
    props: {
      hotels,
      currency,
      showPricing,
    },
  };
}

/**
 * Extract unique meals from itinerary for summary table
 */
export function createMealsSummaryUI(
  itinerary: Itinerary | null,
  showPricing: boolean,
  currency: string
): UIMessage | null {
  if (!itinerary?.days?.length) {
    return null;
  }

  const seen = new Set<string>();
  const meals: MealSummaryUIProps["meals"] = [];

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      if (activity.package_type !== "meal") continue;

      const key = activity.activity.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      meals.push({
        meal_name: activity.activity,
        meal_type: activity.meal_plan,
        participants: activity.quantity?.total_eligible || activity.quantity?.adults,
        unit_price: activity.pricing?.unit_rate,
        total: activity.pricing?.subtotal,
        image_url: activity.image_url,
        location: activity.location,
      });
    }
  }

  if (meals.length === 0) {
    return null;
  }

  return {
    id: `meals-summary-${Date.now()}`,
    name: "meals-summary",
    props: {
      meals,
      currency,
      showPricing,
    },
  };
}

// =====================================================
// INLINE RENDERER DATA GENERATOR
// =====================================================

export interface ServiceCardData {
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
  duration?: string;
  participants?: number;
  transfer_type?: string;
  vehicle?: string;
  meal_plan?: string;
  room_type?: string;
  service_context?: string; // e.g., "From Hotel to Global Village"
}

export interface DayCarouselData {
  day: number;
  activities: ServiceCardData[];
}

export interface ServiceHoverData {
  name: string;
  cardData: ServiceCardData;
}

/**
 * Generate day-wise card data for inline carousel rendering
 */
export function generateDayCarouselsData(
  itinerary: Itinerary | null,
  showPricing: boolean,
  currency: string
): DayCarouselData[] {
  if (!itinerary?.days?.length) {
    return [];
  }

  return itinerary.days.map((day) => ({
    day: day.day,
    activities: day.activities
      .filter((a) => a.package_type && a.package_type !== "free")
      .map((activity) => mapActivityToServiceCard(activity, showPricing, currency)),
  })).filter((d) => d.activities.length > 0);
}

/**
 * Generate service hover data for table cells
 */
export function generateServiceHoverData(
  itinerary: Itinerary | null,
  showPricing: boolean,
  currency: string
): ServiceHoverData[] {
  if (!itinerary?.days?.length) {
    return [];
  }

  const seen = new Set<string>();
  const services: ServiceHoverData[] = [];

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      if (!activity.package_type || activity.package_type === "free") continue;

      const name = activity.activity;
      const key = name.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      services.push({
        name,
        cardData: mapActivityToServiceCard(activity, showPricing, currency),
      });
    }
  }

  return services;
}

/**
 * Map an itinerary activity to ServiceCardData
 */
function mapActivityToServiceCard(
  activity: ItineraryActivity,
  showPricing: boolean,
  currency: string
): ServiceCardData {
  const type = (activity.package_type || "tour") as ServiceCardData["type"];

  return {
    type,
    id: activity.tour_id || activity.hotel_id || activity.transfer_id,
    name: activity.hotel_name || activity.activity,
    subtitle: activity.package_name,
    description: activity.description,
    image_url: activity.image_url,
    rating: activity.rating,
    review_count: activity.review_count,
    location: activity.location,
    price: showPricing ? activity.pricing?.subtotal : undefined,
    currency,
    showPricing,
    duration: activity.duration,
    participants: activity.quantity?.total_eligible || activity.quantity?.adults,
    transfer_type: activity.transfer_type || activity.basis,
    vehicle: activity.vehicle_type,
    meal_plan: activity.meal_plan,
    room_type: activity.room_category,
    service_context: activity.service_context,
  };
}

// =====================================================
// MODERN ITINERARY DATA GENERATOR
// =====================================================

export interface ModernItineraryDay {
  day: number;
  date?: string;
  title: string;
  activities: ServiceCardData[];
  overnight?: string;
}

/**
 * Generate structured day data for ModernItinerary component
 */
export function generateModernItineraryData(
  itinerary: Itinerary | null,
  showPricing: boolean,
  currency: string
): ModernItineraryDay[] {
  if (!itinerary?.days?.length) {
    return [];
  }

  // ✅ FIX: Sort days by day number to ensure correct ordering
  const sortedDays = [...itinerary.days].sort((a, b) => a.day - b.day);

  return sortedDays.map((day) => {
    // Filter out free activities and map to card data
    const activities = day.activities
      .filter((a) => a.package_type && a.package_type !== "free")
      .map((activity) => mapActivityToServiceCard(activity, showPricing, currency));

    return {
      day: day.day,
      date: day.date,
      title: day.title || `Day ${day.day}`,
      activities,
      overnight: itinerary.destination,
    };
  });
}

// =====================================================
// COMBINED GENERATOR
// =====================================================

/**
 * Generate all UI messages for an itinerary
 */
export function generateItineraryUIMessages(
  itinerary: Itinerary | null,
  pricingBreakupRule: string,
  currency: string
): UIMessage[] {
  const showPricing = pricingBreakupRule === "item_breakup";
  const messages: UIMessage[] = [];

  // Generate modern itinerary data
  const days = generateModernItineraryData(itinerary, showPricing, currency);

  // Generate service hover data for tables
  const services = generateServiceHoverData(itinerary, showPricing, currency);

  // Create modern-itinerary UI message
  if (days.length > 0) {
    messages.push({
      id: `modern-itinerary-${Date.now()}`,
      name: "modern-itinerary",
      props: {
        days,
        services,
        showPricing,
        currency,
      },
    });
  }

  return messages;
}

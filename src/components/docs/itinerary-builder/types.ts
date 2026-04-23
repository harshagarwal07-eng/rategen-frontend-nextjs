/**
 * Itinerary Builder Types
 *
 * Types specific to the manual itinerary builder.
 * The output must match ItineraryData from @/types/itinerary exactly.
 */

import type {
  ItineraryData,
  ItineraryDay,
  ItineraryService,
  ServiceType,
  TravelerInfo,
} from "@/types/itinerary";

// Re-export for convenience
export type { ItineraryData, ItineraryDay, ItineraryService, ServiceType, TravelerInfo };

/**
 * Builder form state - editable version of ItineraryData
 */
export interface BuilderFormState {
  destination: string;
  destinationCode: string;
  checkIn: string; // YYYY-MM-DD
  nights: number;
  travelers: TravelerInfo;
  notes: string;
  theme: string;
}

/**
 * Activity being edited in the builder
 */
export interface EditableActivity extends ItineraryService {
  tempId: string; // For tracking during drag-drop
}

/**
 * Day being edited in the builder
 */
export interface EditableDay extends Omit<ItineraryDay, "activities"> {
  tempId: string; // For tracking during drag-drop
  activities: EditableActivity[];
  isExpanded: boolean;
}

/**
 * Builder state
 */
export interface BuilderState {
  form: BuilderFormState;
  days: EditableDay[];
  isDirty: boolean;
  isSaving: boolean;
  activeDay: number | null; // Day number currently being edited
}

/**
 * Service item from search results (hotels, tours, transfers)
 */
export interface ServiceSearchItem {
  id: string;
  type: ServiceType;
  name: string;
  packageName?: string;
  description?: string;
  location?: string;
  imageUrl?: string;
  rating?: number;
  duration?: string;
  price?: number;
  currency?: string;
  // Type-specific
  roomType?: string;
  mealPlan?: string;
  transferType?: string;
  vehicle?: string;
  // Database references
  packageId?: string;
  hotelId?: string;
  tourId?: string;
  transferId?: string;
  // Library reference
  libraryItemId?: string;
  isLibraryItem?: boolean;
  // Raw data
  data?: any;
}

/**
 * Convert builder state to ItineraryData for saving
 */
export function builderStateToItineraryData(
  form: BuilderFormState,
  days: EditableDay[]
): ItineraryData {
  // Calculate check_out from check_in and nights
  const checkInDate = new Date(form.checkIn);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + form.nights);

  return {
    destination: form.destination,
    destination_code: form.destinationCode,
    check_in: form.checkIn,
    check_out: checkOutDate.toISOString().split("T")[0],
    total_days: form.nights + 1, // Days = nights + 1
    days: days.map((day, index) => ({
      day: index + 1,
      date: calculateDayDate(form.checkIn, index),
      title: day.title,
      activities: day.activities.map((act) => ({
        id: act.id,
        type: act.type,
        name: act.name,
        subtitle: act.subtitle,
        description: act.description,
        image_url: act.image_url,
        rating: act.rating,
        review_count: act.review_count,
        location: act.location,
        price: act.price,
        currency: act.currency,
        showPricing: act.showPricing,
        duration: act.duration,
        participants: act.participants,
        time: act.time,
        transfer_type: act.transfer_type,
        vehicle: act.vehicle,
        meal_plan: act.meal_plan,
        room_type: act.room_type,
        basis: act.basis,
        package_id: act.package_id,
        hotel_id: act.hotel_id,
        tour_id: act.tour_id,
        transfer_id: act.transfer_id,
      })),
      overnight: day.overnight,
      notes: day.notes,
    })),
    travelers: form.travelers,
    notes: form.notes || undefined,
    pricing_calculated: false,
    theme: form.theme || undefined,
  };
}

/**
 * Parse ItineraryData from content string
 */
export function parseItineraryContent(content: string): ItineraryData | null {
  try {
    const data = JSON.parse(content);
    // Basic validation
    if (data.destination && data.days && Array.isArray(data.days)) {
      return data as ItineraryData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert ItineraryData to builder state for editing
 */
export function itineraryDataToBuilderState(data: ItineraryData): {
  form: BuilderFormState;
  days: EditableDay[];
} {
  const checkInDate = new Date(data.check_in);
  const checkOutDate = new Date(data.check_out);
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    form: {
      destination: data.destination,
      destinationCode: data.destination_code,
      checkIn: data.check_in,
      nights,
      travelers: data.travelers || { adults: 2, children: 0 },
      notes: data.notes || "",
      theme: data.theme || "",
    },
    days: data.days.map((day, index) => ({
      ...day,
      tempId: `day-${index}-${Date.now()}`,
      activities: day.activities.map((act, actIndex) => ({
        ...act,
        tempId: `act-${index}-${actIndex}-${Date.now()}`,
      })),
      isExpanded: index === 0,
    })),
  };
}

/**
 * Calculate date for a specific day index
 */
export function calculateDayDate(checkIn: string, dayIndex: number): string {
  const date = new Date(checkIn);
  date.setDate(date.getDate() + dayIndex);
  return date.toISOString().split("T")[0];
}

/**
 * Generate default days for a new itinerary
 */
export function generateDefaultDays(nights: number, checkIn: string): EditableDay[] {
  const totalDays = nights + 1;
  return Array.from({ length: totalDays }, (_, index) => ({
    day: index + 1,
    date: calculateDayDate(checkIn, index),
    title: index === 0
      ? "Arrival Day"
      : index === totalDays - 1
        ? "Departure Day"
        : `Day ${index + 1}`,
    activities: [],
    overnight: "",
    notes: "",
    tempId: `day-${index}-${Date.now()}`,
    isExpanded: index === 0,
  }));
}

/**
 * Create a new activity from a service search item
 */
export function createActivityFromService(
  service: ServiceSearchItem,
  time?: string
): EditableActivity {
  return {
    tempId: `act-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    id: service.id,
    type: service.type,
    name: service.packageName || service.name,
    subtitle: service.packageName ? service.name : undefined,
    description: service.description,
    image_url: service.imageUrl,
    rating: service.rating,
    location: service.location,
    price: service.price,
    currency: service.currency,
    duration: service.duration,
    time: time,
    // Type-specific
    room_type: service.roomType,
    meal_plan: service.mealPlan,
    transfer_type: service.transferType,
    vehicle: service.vehicle,
    // Database references
    package_id: service.packageId,
    hotel_id: service.hotelId,
    tour_id: service.tourId,
    transfer_id: service.transferId,
  };
}

/**
 * Convert playground popover activity to EditableActivity
 * The playground popover uses a different format (package_type, activity, etc.)
 */
export function convertPopoverActivityToEditable(popoverActivity: any): EditableActivity {
  // Map package_type to our ServiceType
  const typeMap: Record<string, ServiceType> = {
    hotel: "hotel",
    tour: "tour",
    transfer: "transfer",
    meal: "meal",
    guide: "tour", // Map guide to tour for sample itineraries
    flight: "flight",
  };

  const serviceType = typeMap[popoverActivity.package_type] || "tour";

  // Build name based on service type
  let name = popoverActivity.title || popoverActivity.activity || "Unnamed Activity";
  let subtitle: string | undefined;

  if (serviceType === "hotel") {
    name = popoverActivity.hotel_name || name;
    subtitle = popoverActivity.room_category;
  } else if (serviceType === "tour") {
    name = popoverActivity.package_name || popoverActivity.tour_name || name;
    subtitle = popoverActivity.tour_name;
  } else if (serviceType === "transfer") {
    name = popoverActivity.package_name || popoverActivity.transfer_name || name;
    subtitle = popoverActivity.transfer_name;
  }

  // Get first image from images array
  const imageUrl = popoverActivity.images?.[0] || popoverActivity.image_url;

  return {
    tempId: `act-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    id: popoverActivity.activity_id || crypto.randomUUID(),
    type: serviceType,
    name,
    subtitle,
    description: popoverActivity.package_description || popoverActivity.description,
    image_url: imageUrl,
    rating: popoverActivity.hotel_star_rating,
    location: [
      popoverActivity.hotel_city || popoverActivity.tour_city || popoverActivity.transfer_city,
      popoverActivity.hotel_country || popoverActivity.tour_country || popoverActivity.transfer_country,
    ].filter(Boolean).join(", ") || undefined,
    duration: popoverActivity.duration
      ? typeof popoverActivity.duration === "object"
        ? formatDurationObject(popoverActivity.duration)
        : popoverActivity.duration
      : undefined,
    // Hotel-specific
    room_type: popoverActivity.room_category,
    meal_plan: popoverActivity.meal_plan,
    // Transfer-specific
    transfer_type: popoverActivity.transfer_type || popoverActivity.mode,
    vehicle: popoverActivity.vehicle,
    // Database references
    hotel_id: popoverActivity.hotel_id,
    tour_id: popoverActivity.tour_id || popoverActivity.tour_package_id,
    transfer_id: popoverActivity.transfer_id || popoverActivity.transfer_package_id,
    package_id: popoverActivity.library_item_id,
  };
}

/**
 * Format duration object to string
 */
function formatDurationObject(d: { days?: number; hours?: number; minutes?: number }): string {
  const parts = [];
  if (d.days) parts.push(`${d.days}d`);
  if (d.hours) parts.push(`${d.hours}h`);
  if (d.minutes) parts.push(`${d.minutes}m`);
  return parts.join(" ") || "";
}

/**
 * Service type display info
 */
export const SERVICE_TYPE_INFO: Record<
  ServiceType,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  hotel: {
    label: "Hotel",
    icon: "Building2",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  tour: {
    label: "Tour",
    icon: "FerrisWheel",
    color: "text-accent-foreground",
    bgColor: "bg-accent",
  },
  transfer: {
    label: "Transfer",
    icon: "Car",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  combo: {
    label: "Combo",
    icon: "Package",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  meal: {
    label: "Meal",
    icon: "UtensilsCrossed",
    color: "text-secondary-foreground",
    bgColor: "bg-secondary",
  },
  flight: {
    label: "Flight",
    icon: "Plane",
    color: "text-info",
    bgColor: "bg-info/10",
  },
};

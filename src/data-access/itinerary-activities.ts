"use server";

/**
 * Itinerary Activities Data Access (Frontend)
 *
 * Fetches activities from the normalized itinerary_activities table.
 * This is the source of truth for DMC editing.
 */

import { createClient } from "@/utils/supabase/server";

// =====================================================
// TYPES
// =====================================================

export type ServiceType = "hotel" | "tour" | "transfer" | "combo" | "meal" | "activity";
export type TourType = "ticket_only" | "sic_transfers" | "pvt_transfers";
export type TransferMode = "vehicle" | "vehicle_on_disposal" | "ferry" | "train" | "bus" | "helicopter";
export type TransferType = "SIC" | "PVT";
export type VehicleType = "compact" | "sedan" | "suv" | "minivan" | "van" | "coach";

export interface RoomSelection {
  room_category: string;
  quantity: number;
}

export interface RoomPaxDistribution {
  room_number: number;
  adults: number;
  teens: number;
  children: number;
  infants: number;
  children_ages?: number[];
}

export interface BaseActivity {
  id: string;
  chat_id: string;
  itinerary_id: string;
  service_type: ServiceType;
  service_id?: string; // Reference to package/room ID (tour_package_id, room_id, transfer_package_id)
  service_parent_id?: string; // Reference to parent entity (hotel_id, tour_id, transfer_id)
  day_number: number;
  day_date?: string; // Actual date for this day (YYYY-MM-DD)
  day_title?: string;
  option_number: number;

  // Passengers (categorized by service's age_policy)
  adults: number;
  teens: number;
  children: number;
  infants: number;
  children_ages?: number[];

  // Pricing
  cost_price: number;
  sale_price: number;
  currency: string;

  // Generic activity name (for combo, meal, activity types)
  activity_name?: string;

  // Notes and remarks
  notes?: string;
  remarks?: string;

  // Images (S3 URLs)
  images?: string[];

  created_at: string;
  updated_at: string;
}

export interface HotelActivity extends BaseActivity {
  service_type: "hotel";
  hotel_name: string;
  hotel_address?: string;
  hotel_city?: string;
  hotel_country?: string;
  hotel_star_rating?: string;
  hotel_property_type?: string;
  hotel_phone?: string;
  hotel_email?: string;
  hotel_website?: string;

  // Images
  images?: string[];
  image_url?: string;

  // Check in/out
  check_in_date?: string;
  check_in_time?: string;
  check_out_date?: string;
  check_out_time?: string;
  early_checkin?: boolean;
  late_checkout?: boolean;

  // Rooms
  rooms: RoomSelection[];
  room_pax_distribution?: RoomPaxDistribution[];
  max_occupancy?: string;

  // Meal plan
  meal_plan?: string;
  meal_complimentary?: boolean;

  // Additional info
  offers?: string;
}

export interface TourActivity extends BaseActivity {
  service_type: "tour";
  tour_name: string;
  tour_description?: string;
  tour_address?: string;
  tour_city?: string;
  tour_country?: string;
  tour_type?: TourType;
  tour_category?: string;
  tour_date?: string;
  tour_time?: string;
  duration_days?: number;
  duration_hours?: number;
  duration_minutes?: number;
  // Transfer fields (when tour includes transfers)
  transfer_mode?: TransferMode;
  transfer_type?: TransferType;
  pickup_date?: string;
  pickup_time?: string;
  pickup_point?: string;
  drop_date?: string;
  drop_time?: string;
  drop_point?: string;
  vehicle_type?: VehicleType;
  no_of_vehicles?: number;
  inclusions?: string[];
  exclusions?: string[];
}

export interface TransferActivity extends BaseActivity {
  service_type: "transfer";
  transfer_name: string;
  transfer_description?: string;
  transfer_mode?: TransferMode;
  transfer_type?: TransferType;
  pickup_date?: string;
  pickup_time?: string;
  pickup_point?: string;
  drop_date?: string;
  drop_time?: string;
  drop_point?: string;
  duration_days?: number;
  duration_hours?: number;
  duration_minutes?: number;
  vehicle_type?: VehicleType;
  no_of_vehicles?: number;
  inclusions?: string[];
  exclusions?: string[];
}

export type ItineraryActivity = HotelActivity | TourActivity | TransferActivity;

// Breakup type for nested breakups
export interface ActivityBreakup {
  id: string;
  activity_id: string;
  day_number: number;
  service_date: string;
  service_name: string;
  base_cost: number;
  final_cost: number;
  rate_per_unit: number;
  quantity: number;
  unit_type: string;
  calculation_notes: string[];
  currency: string;
}

export type ActivityWithBreakups = ItineraryActivity & {
  breakups: ActivityBreakup[];
};

// =====================================================
// QUERY OPERATIONS
// =====================================================

/**
 * Get all activities for a chat and option
 */
export async function getActivitiesByChat(chatId: string, optionNumber: number = 1): Promise<ItineraryActivity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("itinerary_activities")
    .select("*")
    .eq("chat_id", chatId)
    .eq("option_number", optionNumber)
    .order("day_number", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getActivitiesByChat] Error:", error);
    return [];
  }

  return (data || []) as ItineraryActivity[];
}

/**
 * Get a single activity by ID
 */
export async function getActivityById(activityId: string): Promise<ItineraryActivity | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("itinerary_activities").select("*").eq("id", activityId).single();

  if (error) {
    console.error("[getActivityById] Error:", error);
    return null;
  }

  return data as ItineraryActivity;
}

/**
 * Get activities with their breakups
 */
export async function getActivitiesWithBreakups(
  chatId: string,
  optionNumber: number = 1
): Promise<ActivityWithBreakups[]> {
  const supabase = await createClient();

  // Get activities
  const { data: activities, error: activitiesError } = await supabase
    .from("itinerary_activities")
    .select("*")
    .eq("chat_id", chatId)
    .eq("option_number", optionNumber)
    .order("day_number", { ascending: true });

  if (activitiesError) {
    console.error("[getActivitiesWithBreakups] Error:", activitiesError);
    return [];
  }

  if (!activities || activities.length === 0) {
    return [];
  }

  // Get breakups for all activities
  const activityIds = activities.map((a) => a.id);
  const { data: breakups, error: breakupsError } = await supabase
    .from("service_breakups")
    .select(
      "id, activity_id, day_number, service_date, service_name, base_cost, final_cost, rate_per_unit, quantity, unit_type, calculation_notes, currency"
    )
    .in("activity_id", activityIds);

  if (breakupsError) {
    console.error("[getActivitiesWithBreakups] Breakups error:", breakupsError);
    return activities.map((a) => ({ ...a, breakups: [] })) as ActivityWithBreakups[];
  }

  // Map breakups to activities
  const breakupsByActivity = new Map<string, ActivityBreakup[]>();
  for (const breakup of breakups || []) {
    if (breakup.activity_id) {
      if (!breakupsByActivity.has(breakup.activity_id)) {
        breakupsByActivity.set(breakup.activity_id, []);
      }
      breakupsByActivity.get(breakup.activity_id)!.push(breakup as ActivityBreakup);
    }
  }

  return activities.map((activity) => ({
    ...activity,
    breakups: breakupsByActivity.get(activity.id) || [],
  })) as ActivityWithBreakups[];
}

/**
 * Get activities grouped by day
 */
export async function getActivitiesGroupedByDay(
  chatId: string,
  optionNumber: number = 1
): Promise<Record<number, ItineraryActivity[]>> {
  const activities = await getActivitiesByChat(chatId, optionNumber);

  const byDay: Record<number, ItineraryActivity[]> = {};
  for (const activity of activities) {
    const day = activity.day_number;
    if (!byDay[day]) {
      byDay[day] = [];
    }
    byDay[day].push(activity);
  }

  return byDay;
}

/**
 * Get all hotel activities for a specific service_id (room_id) in a chat
 * Used for aggregating multi-night hotel stays
 */
export async function getHotelActivitiesByServiceId(
  chatId: string,
  serviceId: string,
  optionNumber: number = 1
): Promise<HotelActivity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("itinerary_activities")
    .select("*")
    .eq("chat_id", chatId)
    .eq("service_id", serviceId)
    .eq("option_number", optionNumber)
    .eq("service_type", "hotel")
    .order("day_number", { ascending: true });

  if (error) {
    console.error("[getHotelActivitiesByServiceId] Error:", error);
    return [];
  }

  return (data || []) as HotelActivity[];
}

/**
 * Get all hotel activities for a specific hotel (service_parent_id) and room (service_id)
 * Used for aggregating multi-night hotel stays with combined check-in/check-out display
 */
export async function getHotelActivitiesByParentAndServiceId(
  chatId: string,
  serviceParentId: string,
  serviceId: string,
  optionNumber: number = 1
): Promise<HotelActivity[]> {
  const supabase = await createClient();

  let query = supabase
    .from("itinerary_activities")
    .select("*")
    .eq("chat_id", chatId)
    .eq("option_number", optionNumber)
    .eq("service_type", "hotel");

  // Filter by service_parent_id (hotel_id) and service_id (room_id)
  if (serviceParentId) {
    query = query.eq("service_parent_id", serviceParentId);
  }
  if (serviceId) {
    query = query.eq("service_id", serviceId);
  }

  const { data, error } = await query.order("day_number", { ascending: true });

  if (error) {
    console.error("[getHotelActivitiesByParentAndServiceId] Error:", error);
    return [];
  }

  return (data || []) as HotelActivity[];
}

/**
 * Get activity summary
 */
export interface ActivitiesSummary {
  total_activities: number;
  total_hotels: number;
  total_tours: number;
  total_transfers: number;
  total_cost: number;
  total_sale: number;
}

export async function getActivitiesSummary(chatId: string, optionNumber: number = 1): Promise<ActivitiesSummary> {
  const activities = await getActivitiesByChat(chatId, optionNumber);

  let totalCost = 0;
  let totalSale = 0;
  let hotels = 0;
  let tours = 0;
  let transfers = 0;

  for (const activity of activities) {
    totalCost += activity.cost_price || 0;
    totalSale += activity.sale_price || 0;

    switch (activity.service_type) {
      case "hotel":
        hotels++;
        break;
      case "tour":
        tours++;
        break;
      case "transfer":
        transfers++;
        break;
    }
  }

  return {
    total_activities: activities.length,
    total_hotels: hotels,
    total_tours: tours,
    total_transfers: transfers,
    total_cost: totalCost,
    total_sale: totalSale,
  };
}

// =====================================================
// UPDATE OPERATIONS
// =====================================================

/**
 * Update an activity
 */
export async function updateActivity(
  activityId: string,
  updates: Partial<Omit<ItineraryActivity, "id" | "chat_id" | "itinerary_id" | "created_at" | "updated_at">>
): Promise<ItineraryActivity | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("itinerary_activities")
    .update(updates)
    .eq("id", activityId)
    .select()
    .single();

  if (error) {
    console.error("[updateActivity] Error:", error);
    return null;
  }

  return data as ItineraryActivity;
}

/**
 * Update activity pricing
 */
export async function updateActivityPricing(
  activityId: string,
  costPrice: number,
  salePrice: number
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("itinerary_activities")
    .update({
      cost_price: costPrice,
      sale_price: salePrice,
    })
    .eq("id", activityId);

  if (error) {
    console.error("[updateActivityPricing] Error:", error);
    return false;
  }

  return true;
}

/**
 * Move activity to a different day
 */
export async function moveActivityToDay(activityId: string, newDayNumber: number): Promise<boolean> {
  const supabase = await createClient();

  // Update activity
  const { error: activityError } = await supabase
    .from("itinerary_activities")
    .update({ day_number: newDayNumber })
    .eq("id", activityId);

  if (activityError) {
    console.error("[moveActivityToDay] Activity error:", activityError);
    return false;
  }

  // Update linked breakups (cascade handled by FK, but update day_number)
  const { error: breakupsError } = await supabase
    .from("service_breakups")
    .update({ day_number: newDayNumber })
    .eq("activity_id", activityId);

  if (breakupsError) {
    console.error("[moveActivityToDay] Breakups error:", breakupsError);
    // Don't fail - FK might handle this
  }

  return true;
}

/**
 * Delete an activity (cascades to breakups via FK)
 */
export async function deleteActivity(activityId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("itinerary_activities").delete().eq("id", activityId);

  if (error) {
    console.error("[deleteActivity] Error:", error);
    return false;
  }

  return true;
}

// =====================================================
// CREATE ACTIVITY
// =====================================================

export interface CreateActivityInput {
  id?: string;
  chat_id: string;
  itinerary_id: string;
  service_type: ServiceType;
  service_id?: string | null;
  service_parent_id?: string; // hotel_id, tour_id, transfer_id
  library_item_id?: string | null; // For library hotels/services
  day_number: number;
  day_date?: string;
  day_title?: string;
  option_number?: number;

  // Passengers
  adults?: number;
  teens?: number;
  children?: number;
  infants?: number;
  children_ages?: number[];

  // Pricing
  cost_price?: number;
  sale_price?: number;
  currency?: string;

  // Notes and remarks
  notes?: string;
  remarks?: string;

  // Hotel fields
  hotel_name?: string;
  hotel_address?: string;
  hotel_city?: string;
  hotel_country?: string;
  hotel_star_rating?: string;
  hotel_property_type?: string;
  hotel_phone?: string;
  hotel_email?: string;
  hotel_website?: string;
  check_in_date?: string;
  check_in_time?: string;
  check_out_date?: string;
  check_out_time?: string;
  early_checkin?: boolean;
  late_checkout?: boolean;
  room_category?: string;
  rooms?: RoomSelection[];
  room_pax_distribution?: RoomPaxDistribution[];
  max_occupancy?: string;
  meal_plan?: string;
  meal_complimentary?: boolean;
  offers?: string;

  // Tour fields
  tour_name?: string;

  // Transfer fields
  transfer_name?: string;
  transfer_type?: TransferType;
  pickup_point?: string;
  drop_point?: string;

  // Generic activity name (for combo, meal, activity types)
  activity_name?: string;

  // Common
  images?: string[];
}

/**
 * Create a new activity
 */
export async function createActivity(input: CreateActivityInput): Promise<ItineraryActivity | null> {
  const supabase = await createClient();

  const insertData: Record<string, any> = {
    chat_id: input.chat_id,
    itinerary_id: input.itinerary_id,
    service_type: input.service_type,
    service_id: input.service_id || null,
    service_parent_id: input.service_parent_id || null,
    day_number: input.day_number,
    day_date: input.day_date || null,
    day_title: input.day_title || null,
    option_number: input.option_number || 1,
    adults: input.adults ?? 2,
    teens: input.teens ?? 0,
    children: input.children ?? 0,
    infants: input.infants ?? 0,
    children_ages: input.children_ages || [],
    cost_price: input.cost_price ?? 0,
    sale_price: input.sale_price ?? 0,
    currency: input.currency || "USD",
    notes: input.notes || null,
    remarks: input.remarks || null,
  };

  // Add ID if provided
  if (input.id) {
    insertData.id = input.id;
  }

  // Only include library_item_id when actually provided
  if (input.library_item_id) {
    insertData.library_item_id = input.library_item_id;
  }

  // Add service-specific fields
  if (input.service_type === "hotel") {
    insertData.hotel_name = input.hotel_name || null;
    insertData.hotel_address = input.hotel_address || null;
    insertData.hotel_city = input.hotel_city || null;
    insertData.hotel_country = input.hotel_country || null;
    insertData.hotel_star_rating = input.hotel_star_rating || null;
    insertData.hotel_property_type = input.hotel_property_type || null;
    insertData.hotel_phone = input.hotel_phone || null;
    insertData.hotel_email = input.hotel_email || null;
    insertData.hotel_website = input.hotel_website || null;
    insertData.check_in_date = input.check_in_date || null;
    insertData.check_in_time = input.check_in_time || null;
    insertData.check_out_date = input.check_out_date || null;
    insertData.check_out_time = input.check_out_time || null;
    insertData.early_checkin = input.early_checkin ?? false;
    insertData.late_checkout = input.late_checkout ?? false;
    insertData.rooms =
      input.rooms || (input.room_category ? [{ room_category: input.room_category, quantity: 1 }] : []);
    insertData.room_pax_distribution = input.room_pax_distribution || [];
    insertData.max_occupancy = input.max_occupancy || null;
    insertData.meal_plan = input.meal_plan || null;
    insertData.meal_complimentary = input.meal_complimentary ?? false;
    insertData.offers = input.offers || null;
  } else if (input.service_type === "tour") {
    insertData.tour_name = input.tour_name || null;
  } else if (input.service_type === "transfer") {
    insertData.transfer_name = input.transfer_name || null;
    insertData.transfer_type = input.transfer_type || null;
    insertData.pickup_point = input.pickup_point || null;
    insertData.drop_point = input.drop_point || null;
  }

  // Generic activity_name for combo, meal, activity types
  if (input.activity_name) {
    insertData.activity_name = input.activity_name;
  }

  // Add images (common to all service types)
  insertData.images = input.images || [];

  const { data, error } = await supabase.from("itinerary_activities").insert(insertData).select().single();

  if (error) {
    console.error("[createActivity] Error:", error);
    return null;
  }

  return data as ItineraryActivity;
}

/**
 * Create multiple activities in bulk (single DB call)
 */
export async function createActivitiesBulk(inputs: CreateActivityInput[]): Promise<ItineraryActivity[]> {
  if (inputs.length === 0) return [];

  const supabase = await createClient();

  const insertData = inputs.map((input) => {
    const data: Record<string, any> = {
      chat_id: input.chat_id,
      itinerary_id: input.itinerary_id,
      service_type: input.service_type,
      service_id: input.service_id || null,
      service_parent_id: input.service_parent_id || null,
      day_number: input.day_number,
      day_date: input.day_date || null,
      day_title: input.day_title || null,
      option_number: input.option_number || 1,
      adults: input.adults ?? 2,
      teens: input.teens ?? 0,
      children: input.children ?? 0,
      infants: input.infants ?? 0,
      children_ages: input.children_ages || [],
      cost_price: input.cost_price ?? 0,
      sale_price: input.sale_price ?? 0,
      currency: input.currency || "USD",
      notes: input.notes || null,
      remarks: input.remarks || null,
    };

    if (input.id) {
      data.id = input.id;
    }

    // Only include library_item_id when actually provided
    if (input.library_item_id) {
      data.library_item_id = input.library_item_id;
    }

    // Add service-specific fields
    if (input.service_type === "hotel") {
      data.hotel_name = input.hotel_name || null;
      data.hotel_address = input.hotel_address || null;
      data.hotel_city = input.hotel_city || null;
      data.hotel_country = input.hotel_country || null;
      data.hotel_star_rating = input.hotel_star_rating || null;
      data.hotel_property_type = input.hotel_property_type || null;
      data.hotel_phone = input.hotel_phone || null;
      data.hotel_email = input.hotel_email || null;
      data.hotel_website = input.hotel_website || null;
      data.check_in_date = input.check_in_date || null;
      data.check_in_time = input.check_in_time || null;
      data.check_out_date = input.check_out_date || null;
      data.check_out_time = input.check_out_time || null;
      data.early_checkin = input.early_checkin ?? false;
      data.late_checkout = input.late_checkout ?? false;
      data.rooms = input.rooms || (input.room_category ? [{ room_category: input.room_category, quantity: 1 }] : []);
      data.room_pax_distribution = input.room_pax_distribution || [];
      data.max_occupancy = input.max_occupancy || null;
      data.meal_plan = input.meal_plan || null;
      data.meal_complimentary = input.meal_complimentary ?? false;
      data.offers = input.offers || null;
    } else if (input.service_type === "tour") {
      data.tour_name = input.tour_name || null;
    } else if (input.service_type === "transfer") {
      data.transfer_name = input.transfer_name || null;
      data.transfer_type = input.transfer_type || null;
      data.pickup_point = input.pickup_point || null;
      data.drop_point = input.drop_point || null;
    }

    // Generic activity_name for combo, meal, activity types
    if (input.activity_name) {
      data.activity_name = input.activity_name;
    }

    // Add images (common to all service types)
    data.images = input.images || [];

    return data;
  });

  const { data, error } = await supabase.from("itinerary_activities").insert(insertData).select();

  if (error) {
    console.error("[createActivitiesBulk] Error:", error);
    return [];
  }

  return (data || []) as ItineraryActivity[];
}

// =====================================================
// BUILD ITINERARY_DATA FROM ACTIVITIES
// =====================================================

export interface BuiltDay {
  day: number;
  date: string | null;
  title: string | null;
  activities: BuiltActivity[];
}

export interface BuiltActivity {
  activity_id: string;
  package_type: ServiceType;
  activity: string;
  service_name: string;
  basis: string | null;
  hotel_name?: string;
  room_category?: string;
  meal_plan?: string;
  tour_name?: string;
  transfer_name?: string;
  transfer_type?: string;
  pickup_point?: string;
  drop_point?: string;
}

export interface BuiltItinerary {
  days: BuiltDay[];
  destination: { country: string; city: string; code: string };
  check_in: string;
  check_out: string;
  nights: number;
  travelers: { adults: number; children: number; infants: number; children_ages: number[] };
}

/**
 * Build itinerary_data structure from activities
 */
function buildItineraryData(
  activities: ItineraryActivity[],
  meta: {
    destination: string;
    destination_code: string | null;
    check_in: string;
    check_out: string;
    nights: number;
    adults: number;
    children: number;
    children_ages: number[] | null;
  }
): BuiltItinerary {
  // Helper: compute date for a given day number from check_in
  function computeDayDate(dayNumber: number): string | null {
    if (!meta.check_in) return null;
    const base = new Date(meta.check_in + "T00:00:00");
    if (isNaN(base.getTime())) return null;
    base.setDate(base.getDate() + (dayNumber - 1));
    return base.toISOString().split("T")[0];
  }

  // 1. Generate all days (1 through nights+1): 3 nights = 4 days (arrival through departure)
  const totalDays = meta.nights + 1;
  const dayMap = new Map<number, { date: string | null; title: string | null; activities: BuiltActivity[] }>();
  for (let d = 1; d <= totalDays; d++) {
    dayMap.set(d, {
      date: computeDayDate(d),
      title: null,
      activities: [],
    });
  }

  // 2. Merge existing activities into matching days
  for (const act of activities) {
    if (!dayMap.has(act.day_number)) {
      // Activity is beyond the nights range — append the day
      dayMap.set(act.day_number, {
        date: (act as any).day_date || computeDayDate(act.day_number),
        title: (act as any).day_title || null,
        activities: [],
      });
    } else {
      // Update date/title from activity if available
      const existing = dayMap.get(act.day_number)!;
      if ((act as any).day_date) existing.date = (act as any).day_date;
      if ((act as any).day_title) existing.title = (act as any).day_title;
    }

    const built: BuiltActivity = {
      activity_id: act.id,
      package_type: act.service_type,
      activity: "",
      service_name: "",
      basis: null,
    };

    if (act.service_type === "hotel") {
      const h = act as HotelActivity;
      built.activity = h.hotel_name;
      built.service_name = h.hotel_name;
      built.hotel_name = h.hotel_name;
      built.room_category = h.rooms?.[0]?.room_category;
      built.meal_plan = h.meal_plan;
    } else if (act.service_type === "tour") {
      const t = act as TourActivity;
      built.activity = t.tour_name;
      built.service_name = t.tour_name;
      built.tour_name = t.tour_name;
    } else if (act.service_type === "transfer") {
      const tr = act as TransferActivity;
      built.activity = tr.transfer_name;
      built.service_name = tr.transfer_name;
      built.transfer_name = tr.transfer_name;
      built.transfer_type = tr.transfer_type;
      built.basis = tr.transfer_type || null;
      built.pickup_point = tr.pickup_point;
      built.drop_point = tr.drop_point;
    } else {
      // combo, meal, activity types
      const name = act.activity_name || act.service_type;
      built.activity = name;
      built.service_name = name;
    }

    dayMap.get(act.day_number)!.activities.push(built);
  }

  const days: BuiltDay[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([dayNum, data]) => ({
      day: dayNum,
      date: data.date,
      title: data.title,
      activities: data.activities,
    }));

  return {
    days,
    destination: { country: meta.destination, city: "", code: meta.destination_code || "" },
    check_in: meta.check_in,
    check_out: meta.check_out,
    nights: meta.nights,
    travelers: {
      adults: meta.adults,
      children: meta.children,
      infants: 0,
      children_ages: meta.children_ages || [],
    },
  };
}

/**
 * Lightweight: get itinerary options for a chat from chat_itineraries.
 * Returns empty array if no itinerary options exist.
 */
export async function getItineraryOptionsByChatId(
  chatId: string
): Promise<{ option_number: number; recommended: boolean | null }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_itineraries")
    .select("option_number, recommended")
    .eq("chat_id", chatId)
    .order("option_number", { ascending: true });

  if (error) {
    console.error("[getItineraryOptionsByChatId] Error:", error);
    return [];
  }

  return (data || []) as { option_number: number; recommended: boolean | null }[];
}

/**
 * Get full itinerary with itinerary_data built from activities
 */
export async function getItineraryWithActivities(chatId: string, optionNumber: number = 1) {
  const supabase = await createClient();

  // Get itinerary metadata
  const { data: itinerary, error } = await supabase
    .from("chat_itineraries")
    .select("*")
    .eq("chat_id", chatId)
    .eq("option_number", optionNumber)
    .single();

  if (error || !itinerary) {
    if (error?.code !== "PGRST116") {
      console.error("[getItineraryWithActivities] Error:", error);
    }
    return null;
  }

  // Get activities
  const activities = await getActivitiesByChat(chatId, optionNumber);

  // Build itinerary_data from activities
  const itinerary_data = buildItineraryData(activities, {
    destination: itinerary.destination,
    destination_code: itinerary.destination_code,
    check_in: itinerary.check_in,
    check_out: itinerary.check_out,
    nights: itinerary.nights,
    adults: itinerary.adults,
    children: itinerary.children,
    children_ages: itinerary.children_ages,
  });

  return {
    ...itinerary,
    itinerary_data,
  };
}

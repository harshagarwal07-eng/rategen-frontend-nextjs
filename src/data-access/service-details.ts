"use server";

import { createClient } from "@/utils/supabase/server";

// =====================================================
// SERVICE DETAILS - Fetch by service_id
// =====================================================

export interface TourPackageDetails {
  // Package fields
  id: string;
  name: string;
  description?: string;
  remarks?: string;
  images?: string[];
  inclusions?: string;
  exclusions?: string;
  notes?: string;
  meeting_point?: string;
  pickup_point?: string;
  dropoff_point?: string;
  duration?: { days?: number; hours?: number; minutes?: number };
  operational_hours?: Array<{ day: string; start_time: string; end_time: string }>;
  max_participants?: number;
  child_policy?: string;
  preferred?: boolean;
  iscombo?: boolean;
  seasons?: any[];
  // Parent tour fields
  tour_id?: string;
  tour_name?: string;
  tour_description?: string;
  tour_address?: string;
  tour_city?: string;
  tour_country?: string;
  tour_type?: string;
  tour_category?: string;
  city_name?: string;
  country_name?: string;
}

export interface TransferPackageDetails {
  // Package fields
  id: string;
  name: string;
  description?: string;
  remarks?: string;
  images?: string[];
  inclusions?: string;
  exclusions?: string;
  child_policy?: string;
  preferred?: boolean;
  iscombo?: boolean;
  seasons?: any[];
  transfer_type?: string[];
  // Parent transfer fields
  transfer_id?: string;
  transfer_name?: string;
  route?: string;
  mode?: string;
  origin?: string;
  destination?: string;
  num_stops?: number;
  via?: string;
  duration?: string;
  city_name?: string;
  country_name?: string;
}

export interface HotelRoomDetails {
  // Room fields
  id: string;
  room_category: string;
  meal_plan?: string;
  max_occupancy?: string;
  other_details?: string;
  extra_bed_policy?: string;
  stop_sale?: string;
  seasons?: any[];
  // Parent hotel fields
  hotel_id?: string;
  hotel_name?: string;
  hotel_description?: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_email?: string;
  property_type?: string;
  star_rating?: string;
  cancellation_policy?: string;
  payment_policy?: string;
  group_policy?: string;
  age_policy?: any;
  meal_plan_rates?: any;
  offers?: string;
  remarks?: string;
  city_name?: string;
  country_name?: string;
  images?: string[]; // Placeholder - hotels don't have images yet
}

export type ServiceDetails =
  | { type: "tour"; data: TourPackageDetails }
  | { type: "transfer"; data: TransferPackageDetails }
  | { type: "hotel"; data: HotelRoomDetails }
  | { type: "combo"; data: TourPackageDetails }; // Combos use tour_packages with iscombo=true

/**
 * Get tour package details by package ID (service_id)
 */
export async function getTourPackageDetails(packageId: string): Promise<{ data: TourPackageDetails | null; error: string | null }> {
  const supabase = await createClient();

  console.log(`[getTourPackageDetails] Fetching package: ${packageId}`);

  const { data, error } = await supabase
    .from("tour_packages")
    .select(`
      *,
      tours(
        id,
        tour_name,
        description,
        formatted_address,
        types,
        remarks,
        cancellation_policy,
        child_policy,
        countries(country_name),
        cities(city_name)
      )
    `)
    .eq("id", packageId)
    .single();

  if (error) {
    console.error(`[getTourPackageDetails] Error: ${error.message}`, { packageId, errorCode: error.code });
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: "Package not found" };
  }

  const tour = data.tours;
  const result: TourPackageDetails = {
    // Package fields
    id: data.id,
    name: data.name,
    description: data.description,
    remarks: data.remarks,
    images: data.images || [],
    inclusions: data.inclusions,
    exclusions: data.exclusions,
    notes: data.notes,
    meeting_point: data.meeting_point,
    pickup_point: data.pickup_point,
    dropoff_point: data.dropoff_point,
    duration: data.duration,
    operational_hours: data.operational_hours,
    max_participants: data.max_participants,
    child_policy: data.child_policy,
    preferred: data.preferred,
    iscombo: data.iscombo,
    seasons: data.seasons,
    // Parent tour fields
    tour_id: tour?.id,
    tour_name: tour?.tour_name,
    tour_description: tour?.description,
    tour_address: tour?.formatted_address,
    tour_type: tour?.types?.[0], // types is an array, use first as primary type
    tour_category: tour?.types?.join(", "), // join all types as category string
    city_name: (tour?.cities as any)?.city_name,
    country_name: (tour?.countries as any)?.country_name,
  };

  return { data: result, error: null };
}

/**
 * Get transfer package details by package ID (service_id)
 */
export async function getTransferPackageDetails(packageId: string): Promise<{ data: TransferPackageDetails | null; error: string | null }> {
  const supabase = await createClient();

  console.log(`[getTransferPackageDetails] Fetching package: ${packageId}`);

  // Select transfer package with parent transfer data
  // Note: origin, destination, num_stops, via, duration are in transfer_packages, not transfers
  const { data, error } = await supabase
    .from("transfer_packages")
    .select(`
      *,
      transfers(
        id,
        transfer_name,
        route,
        mode,
        description,
        remarks,
        child_policy,
        cancellation_policy,
        countries(country_name),
        cities(city_name)
      )
    `)
    .eq("id", packageId)
    .single();

  if (error) {
    console.error(`[getTransferPackageDetails] Error: ${error.message}`, { packageId, errorCode: error.code });
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: "Package not found" };
  }

  const transfer = data.transfers;
  const result: TransferPackageDetails = {
    // Package fields (origin, destination, num_stops, via, duration are here!)
    id: data.id,
    name: data.name,
    description: data.description,
    remarks: data.remarks,
    images: data.images || [],
    inclusions: data.inclusions,
    exclusions: data.exclusions,
    child_policy: data.child_policy,
    preferred: data.preferred,
    iscombo: data.iscombo,
    seasons: data.seasons,
    transfer_type: data.transfer_type,
    origin: data.origin,
    destination: data.destination,
    num_stops: data.num_stops,
    via: data.via,
    duration: data.duration ? JSON.stringify(data.duration) : undefined,
    // Parent transfer fields
    transfer_id: transfer?.id,
    transfer_name: transfer?.transfer_name,
    route: transfer?.route,
    mode: transfer?.mode,
    city_name: (transfer?.cities as any)?.city_name,
    country_name: (transfer?.countries as any)?.country_name,
  };

  return { data: result, error: null };
}

/**
 * Get hotel room details by room ID (service_id)
 */
export async function getHotelRoomDetails(roomId: string): Promise<{ data: HotelRoomDetails | null; error: string | null }> {
  const supabase = await createClient();

  console.log(`[getHotelRoomDetails] Fetching room: ${roomId}`);

  // Note: hotels table doesn't have check_in_time/check_out_time
  // hotel_city and hotel_country are UUID FKs, not text
  const { data, error } = await supabase
    .from("hotel_rooms")
    .select(`
      *,
      hotels(
        id,
        hotel_name,
        hotel_description,
        hotel_address,
        hotel_phone,
        hotel_email,
        property_type,
        star_rating,
        cancellation_policy,
        payment_policy,
        group_policy,
        age_policy,
        meal_plan_rates,
        remarks,
        offers,
        countries:hotel_country(country_name),
        cities:hotel_city(city_name)
      )
    `)
    .eq("id", roomId)
    .single();

  if (error) {
    console.error(`[getHotelRoomDetails] Error: ${error.message}`, { roomId, errorCode: error.code });
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: "Room not found" };
  }

  const hotel = data.hotels;
  const result: HotelRoomDetails = {
    // Room fields
    id: data.id,
    room_category: data.room_category,
    meal_plan: data.meal_plan,
    max_occupancy: data.max_occupancy,
    other_details: data.other_details,
    extra_bed_policy: data.extra_bed_policy,
    stop_sale: data.stop_sale,
    seasons: data.seasons,
    // Parent hotel fields
    hotel_id: hotel?.id,
    hotel_name: hotel?.hotel_name,
    hotel_description: hotel?.hotel_description,
    hotel_address: hotel?.hotel_address,
    hotel_phone: hotel?.hotel_phone,
    hotel_email: hotel?.hotel_email,
    property_type: hotel?.property_type,
    star_rating: hotel?.star_rating,
    cancellation_policy: hotel?.cancellation_policy,
    payment_policy: hotel?.payment_policy,
    group_policy: hotel?.group_policy,
    age_policy: hotel?.age_policy,
    meal_plan_rates: hotel?.meal_plan_rates,
    offers: hotel?.offers,
    remarks: hotel?.remarks,
    city_name: (hotel?.cities as any)?.city_name,
    country_name: (hotel?.countries as any)?.country_name,
    images: [], // Hotels don't have images yet
  };

  return { data: result, error: null };
}

/**
 * Get all rooms for a hotel by hotel_id
 */
export async function getHotelRoomsByHotelId(hotelId: string): Promise<{
  data: Array<{ id: string; room_category: string; meal_plan?: string; max_occupancy?: string }> | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hotel_rooms")
    .select("id, room_category, meal_plan, max_occupancy")
    .eq("hotel_id", hotelId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(`[getHotelRoomsByHotelId] Error: ${error.message}`);
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * Get service details by service_id and service_type
 * This is the main function to use from the frontend
 */
export async function getServiceDetailsByServiceId(
  serviceId: string,
  serviceType: "hotel" | "tour" | "transfer" | "combo"
): Promise<{ data: ServiceDetails | null; error: string | null }> {
  console.log(`[getServiceDetailsByServiceId] Called`, { serviceId, serviceType });

  if (!serviceId) {
    console.log(`[getServiceDetailsByServiceId] No service_id provided`);
    return { data: null, error: "No service_id provided" };
  }

  switch (serviceType) {
    case "hotel": {
      const result = await getHotelRoomDetails(serviceId);
      if (result.error || !result.data) {
        return { data: null, error: result.error || "Not found" };
      }
      return { data: { type: "hotel", data: result.data }, error: null };
    }

    case "tour": {
      const result = await getTourPackageDetails(serviceId);
      if (result.error || !result.data) {
        return { data: null, error: result.error || "Not found" };
      }
      return { data: { type: "tour", data: result.data }, error: null };
    }

    case "transfer": {
      const result = await getTransferPackageDetails(serviceId);
      if (result.error || !result.data) {
        return { data: null, error: result.error || "Not found" };
      }
      return { data: { type: "transfer", data: result.data }, error: null };
    }

    case "combo": {
      // Combos use tour_packages with iscombo=true
      const result = await getTourPackageDetails(serviceId);
      if (result.error || !result.data) {
        return { data: null, error: result.error || "Not found" };
      }
      return { data: { type: "combo", data: result.data }, error: null };
    }

    default:
      return { data: null, error: `Unknown service type: ${serviceType}` };
  }
}

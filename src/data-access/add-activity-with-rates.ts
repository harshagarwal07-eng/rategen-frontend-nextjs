"use server";

import { createClient } from "@/utils/supabase/server";
import { getChatItinerary } from "./chat-itinerary";
import { createActivity, createActivitiesBulk, type CreateActivityInput } from "./itinerary-activities";
import { createManualBreakup, createBreakupsBulk, type ManualBreakupInput, type ServiceType, type UnitType } from "./service-breakups";
import {
  getHotelRoomRates,
  getTourPackageRates,
  getTransferPackageRates,
  findMatchingSeason,
} from "./service-rates-fetch";

// Helper to get latest assistant message_id for a chat
async function getLatestAssistantMessageId(chatId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("travel_agent_messages")
    .select("id")
    .eq("chat_id", chatId)
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error("[getLatestAssistantMessageId] Error:", error?.message);
    return null;
  }

  return data.id;
}

// =====================================================
// TYPES
// =====================================================

export interface AddActivityInput {
  chatId: string;
  optionNumber: number;
  dayNumber: number;
  dayDate: string; // YYYY-MM-DD
  serviceType: "hotel" | "tour" | "transfer";
  serviceId: string; // room_id / tour_package_id / transfer_package_id
  serviceName: string; // Display name
  additionalData?: {
    // Hotel specific
    hotel_id?: string;
    hotel_name?: string;
    hotel_city?: string;
    hotel_country?: string;
    hotel_address?: string;
    hotel_star_rating?: string;
    hotel_property_type?: string;
    room_category?: string;
    meal_plan?: string;
    nights?: number; // For hotels, how many nights
    // Tour specific
    tour_id?: string;
    tour_name?: string;
    package_name?: string;
    // Transfer specific
    transfer_id?: string;
    transfer_name?: string;
    transfer_type?: string; // arrival/departure/inter_hotel
    pickup_point?: string;
    drop_point?: string;
    // Common
    images?: string[];
  };
}

export interface AddActivityResult {
  success: boolean;
  activity?: any;
  breakups?: any[];
  error?: string;
}

interface BreakupData {
  serviceName: string;
  serviceType: ServiceType;
  quantity: number;
  unitType: UnitType;
  ratePerUnit: number;
  baseCost: number;
  finalCost: number;
  calculationNotes: string[];
  serviceContext?: string;
  serviceId?: string;
  roomId?: string;
  seasonName?: string;
}

// =====================================================
// MAIN FUNCTION
// =====================================================

export async function addActivityWithRates(input: AddActivityInput): Promise<AddActivityResult> {
  const { chatId, optionNumber, dayNumber, dayDate, serviceType, serviceId, serviceName, additionalData } = input;

  console.log("[addActivityWithRates] Starting", { chatId, dayNumber, serviceType, serviceId });

  try {
    // 1. Fetch itinerary to get id and pax
    const itinerary = await getChatItinerary(chatId, optionNumber);
    if (!itinerary) {
      return { success: false, error: "Itinerary not found" };
    }

    const { id: itineraryId, adults, children, children_ages } = itinerary;
    const pax = {
      adults: adults || 2,
      children: children || 0,
      children_ages: children_ages || [],
    };

    console.log("[addActivityWithRates] Itinerary found", { itineraryId, pax });

    // 2. Generate activity ID
    const activityId = crypto.randomUUID();

    // 3. Fetch rates based on service type
    let rates: any = null;
    let breakupsData: BreakupData[] = [];
    let currency = "USD";

    if (serviceType === "hotel") {
      rates = await getHotelRoomRates(serviceId);
      console.log("[addActivityWithRates] Hotel rates:", { serviceId, rates: rates ? { seasons: rates.seasons?.length } : null });
      if (rates) {
        currency = rates.currency || "USD";
        const season = await findMatchingSeason(rates.seasons, dayDate);
        console.log("[addActivityWithRates] Season matched:", { dayDate, season });
        breakupsData = calculateHotelBreakups({
          rates,
          season,
          pax,
          nights: additionalData?.nights || 1,
          hotelName: additionalData?.hotel_name || serviceName,
          roomCategory: additionalData?.room_category,
          roomId: serviceId,
        });
      }
    } else if (serviceType === "tour") {
      rates = await getTourPackageRates(serviceId);
      console.log("[addActivityWithRates] Tour rates:", { serviceId, rates: rates ? { seasons: rates.seasons?.length } : null });
      if (rates) {
        currency = rates.currency || "USD";
        const season = await findMatchingSeason(rates.seasons, dayDate);
        console.log("[addActivityWithRates] Season matched:", { dayDate, season });
        breakupsData = calculateTourBreakups({
          rates,
          season,
          pax,
          tourName: additionalData?.tour_name || serviceName,
          packageName: additionalData?.package_name,
          packageId: serviceId,
        });
      }
    } else if (serviceType === "transfer") {
      rates = await getTransferPackageRates(serviceId);
      console.log("[addActivityWithRates] Transfer rates:", { serviceId, rates: rates ? { seasons: rates.seasons?.length, mode: rates.mode } : null });
      if (rates) {
        currency = rates.currency || "USD";
        const season = await findMatchingSeason(rates.seasons, dayDate);
        console.log("[addActivityWithRates] Season matched:", { dayDate, season });
        breakupsData = calculateTransferBreakups({
          rates,
          season,
          pax,
          transferName: additionalData?.transfer_name || serviceName,
          transferType: additionalData?.transfer_type,
          pickupPoint: additionalData?.pickup_point,
          dropPoint: additionalData?.drop_point,
          packageId: serviceId,
        });
      }
    }

    console.log("[addActivityWithRates] Rates fetched", {
      hasRates: !!rates,
      breakupsCount: breakupsData.length,
      seasonMatched: breakupsData.length > 0,
    });

    // 4. Calculate total cost
    const totalCost = breakupsData.reduce((sum, b) => sum + b.finalCost, 0);

    // 5. Create activity in itinerary_activities table
    const activityInput: CreateActivityInput = {
      id: activityId,
      chat_id: chatId,
      itinerary_id: itineraryId,
      service_type: serviceType,
      service_id: serviceId,
      service_parent_id: additionalData?.hotel_id || additionalData?.tour_id || additionalData?.transfer_id,
      day_number: dayNumber,
      day_date: dayDate,
      adults: pax.adults,
      teens: 0,
      children: pax.children,
      infants: 0,
      children_ages: pax.children_ages,
      cost_price: totalCost,
      sale_price: totalCost,
      currency: currency,
      option_number: optionNumber,
      // Service-specific fields
      ...(serviceType === "hotel"
        ? {
            hotel_name: additionalData?.hotel_name,
            hotel_city: additionalData?.hotel_city,
            hotel_country: additionalData?.hotel_country,
            hotel_address: additionalData?.hotel_address,
            hotel_star_rating: additionalData?.hotel_star_rating,
            hotel_property_type: additionalData?.hotel_property_type,
            room_category: additionalData?.room_category,
            meal_plan: additionalData?.meal_plan,
          }
        : {}),
      ...(serviceType === "tour"
        ? {
            tour_name: additionalData?.tour_name || serviceName,
          }
        : {}),
      ...(serviceType === "transfer"
        ? {
            transfer_name: additionalData?.transfer_name || serviceName,
            transfer_type: additionalData?.transfer_type as any,
            pickup_point: additionalData?.pickup_point,
            drop_point: additionalData?.drop_point,
          }
        : {}),
      // Images (common to all service types)
      images: additionalData?.images || [],
    };

    const activity = await createActivity(activityInput);
    if (!activity) {
      return { success: false, error: "Failed to create activity" };
    }

    console.log("[addActivityWithRates] Activity created", { activityId: activity.id });

    // 6. Create breakups - need a valid message_id (FK constraint to travel_agent_messages)
    const messageId = await getLatestAssistantMessageId(chatId);
    if (!messageId) {
      console.error("[addActivityWithRates] No assistant message found for chat");
      // Still return success for the activity, just no breakups
      return {
        success: true,
        activity,
        breakups: [],
      };
    }
    const savedBreakups: any[] = [];

    console.log("[addActivityWithRates] Creating breakups:", { count: breakupsData.length, breakupsData });

    for (const breakup of breakupsData) {
      const breakupInput: ManualBreakupInput = {
        chat_id: chatId,
        message_id: messageId,
        day_number: dayNumber,
        service_date: dayDate,
        service_name: breakup.serviceName,
        service_type: breakup.serviceType,
        quantity: breakup.quantity,
        unit_type: breakup.unitType,
        rate_per_unit: breakup.ratePerUnit,
        base_cost: breakup.baseCost,
        discount_amount: 0,
        markup_amount: 0,
        tax_amount: 0,
        final_cost: breakup.finalCost,
        currency: currency,
        calculation_notes: breakup.calculationNotes,
        option_number: optionNumber,
        cost_price: breakup.finalCost,
        price_source: "standard",
        service_id: breakup.serviceId,
        room_id: breakup.roomId,
        activity_id: activityId,
      };

      console.log("[addActivityWithRates] Saving breakup:", breakupInput);
      const saved = await createManualBreakup(breakupInput);
      if (saved) {
        savedBreakups.push(saved);
        console.log("[addActivityWithRates] Breakup saved:", saved.id);
      } else {
        console.error("[addActivityWithRates] Failed to save breakup");
      }
    }

    console.log("[addActivityWithRates] Breakups created", { count: savedBreakups.length });

    return {
      success: true,
      activity,
      breakups: savedBreakups,
    };
  } catch (error) {
    console.error("[addActivityWithRates] Error:", error);
    return { success: false, error: (error as Error).message };
  }
}

// =====================================================
// BULK MULTI-NIGHT HOTEL CREATION
// =====================================================

export interface AddMultiNightHotelInput {
  chatId: string;
  optionNumber: number;
  startDayNumber: number;
  startDayDate: string; // YYYY-MM-DD
  nights: number;
  serviceId: string; // room_id
  hotelId: string;
  hotelName: string;
  hotelCity?: string;
  hotelCountry?: string;
  hotelAddress?: string;
  hotelStarRating?: string;
  hotelPropertyType?: string;
  roomCategory?: string;
  mealPlan?: string;
  maxOccupancy?: string;
  rooms?: Array<{ room_category: string; quantity: number }>;
  roomPaxDistribution?: Array<{
    room_number: number;
    adults: number;
    teens: number;
    children: number;
    infants: number;
    children_ages?: number[];
  }>;
  checkInDate?: string;
  checkOutDate?: string;
  images?: string[];
}

export interface AddMultiNightHotelResult {
  success: boolean;
  activities?: any[];
  breakups?: any[];
  firstActivityId?: string;
  error?: string;
}

export async function addMultiNightHotelWithRates(input: AddMultiNightHotelInput): Promise<AddMultiNightHotelResult> {
  const {
    chatId,
    optionNumber,
    startDayNumber,
    startDayDate,
    nights,
    serviceId,
    hotelId,
    hotelName,
    hotelCity,
    hotelCountry,
    hotelAddress,
    hotelStarRating,
    hotelPropertyType,
    roomCategory,
    mealPlan,
    maxOccupancy,
    rooms,
    roomPaxDistribution,
    checkInDate,
    checkOutDate,
    images,
  } = input;

  console.log("[addMultiNightHotelWithRates] Starting", { chatId, startDayNumber, nights, hotelName });

  try {
    // 1. Fetch itinerary to get id and pax
    const itinerary = await getChatItinerary(chatId, optionNumber);
    if (!itinerary) {
      return { success: false, error: "Itinerary not found" };
    }

    const { id: itineraryId, adults, children, children_ages } = itinerary;
    const pax = {
      adults: adults || 2,
      children: children || 0,
      children_ages: children_ages || [],
    };

    // 2. Fetch hotel room rates once
    const rates = await getHotelRoomRates(serviceId);
    let currency = "USD";
    if (rates) {
      currency = rates.currency || "USD";
    }

    // 3. Get message_id for breakups (FK constraint)
    const messageId = await getLatestAssistantMessageId(chatId);
    if (!messageId) {
      console.error("[addMultiNightHotelWithRates] No assistant message found for chat");
      return { success: false, error: "No assistant message found" };
    }

    // 4. Prepare all activities and breakups for bulk insert
    const activityInputs: CreateActivityInput[] = [];
    const breakupInputs: ManualBreakupInput[] = [];
    const activityIds: string[] = [];

    for (let nightIndex = 0; nightIndex < nights; nightIndex++) {
      const activityId = crypto.randomUUID();
      activityIds.push(activityId);

      const currentDayNumber = startDayNumber + nightIndex;

      // Calculate date for this night
      const baseDate = new Date(startDayDate);
      baseDate.setDate(baseDate.getDate() + nightIndex);
      const currentDayDate = baseDate.toISOString().split("T")[0];

      // Find matching season for this date
      let season: any = null;
      let breakupsData: BreakupData[] = [];

      if (rates) {
        season = await findMatchingSeason(rates.seasons, currentDayDate);
        if (season) {
          // Calculate breakups for this single night
          breakupsData = calculateHotelBreakups({
            rates,
            season,
            pax,
            nights: 1, // Each activity is for 1 night
            hotelName,
            roomCategory,
            roomId: serviceId,
          });
        }
      }

      const totalCost = breakupsData.reduce((sum, b) => sum + b.finalCost, 0);
      const displayName = roomCategory ? `${hotelName} - ${roomCategory}` : hotelName;

      // Add activity input
      activityInputs.push({
        id: activityId,
        chat_id: chatId,
        itinerary_id: itineraryId,
        service_type: "hotel",
        service_id: serviceId,
        service_parent_id: hotelId,
        day_number: currentDayNumber,
        day_date: currentDayDate,
        adults: pax.adults,
        teens: 0,
        children: pax.children,
        infants: 0,
        children_ages: pax.children_ages,
        cost_price: totalCost,
        sale_price: totalCost,
        currency: currency,
        option_number: optionNumber,
        hotel_name: hotelName,
        hotel_city: hotelCity,
        hotel_country: hotelCountry,
        hotel_address: hotelAddress,
        hotel_star_rating: hotelStarRating,
        hotel_property_type: hotelPropertyType,
        room_category: roomCategory,
        meal_plan: mealPlan,
        max_occupancy: maxOccupancy,
        rooms: rooms || (roomCategory ? [{ room_category: roomCategory, quantity: 1 }] : []),
        room_pax_distribution: roomPaxDistribution,
        check_in_date: nightIndex === 0 ? checkInDate : undefined,
        check_out_date: nightIndex === nights - 1 ? checkOutDate : undefined,
        images: images || [],
      });

      // Add breakup inputs for this night
      for (const breakup of breakupsData) {
        breakupInputs.push({
          chat_id: chatId,
          message_id: messageId,
          day_number: currentDayNumber,
          service_date: currentDayDate,
          service_name: breakup.serviceName,
          service_type: breakup.serviceType,
          quantity: breakup.quantity,
          unit_type: breakup.unitType,
          rate_per_unit: breakup.ratePerUnit,
          base_cost: breakup.baseCost,
          discount_amount: 0,
          markup_amount: 0,
          tax_amount: 0,
          final_cost: breakup.finalCost,
          currency: currency,
          calculation_notes: breakup.calculationNotes,
          option_number: optionNumber,
          cost_price: breakup.finalCost,
          price_source: "standard",
          room_id: breakup.roomId,
          activity_id: activityId,
        });
      }
    }

    console.log("[addMultiNightHotelWithRates] Prepared", {
      activityCount: activityInputs.length,
      breakupCount: breakupInputs.length,
    });

    // 5. Bulk insert activities
    const activities = await createActivitiesBulk(activityInputs);
    if (activities.length === 0) {
      return { success: false, error: "Failed to create activities" };
    }

    console.log("[addMultiNightHotelWithRates] Activities created:", activities.length);

    // 6. Bulk insert breakups
    const breakups = await createBreakupsBulk(breakupInputs);
    console.log("[addMultiNightHotelWithRates] Breakups created:", breakups.length);

    return {
      success: true,
      activities,
      breakups,
      firstActivityId: activityIds[0],
    };
  } catch (error) {
    console.error("[addMultiNightHotelWithRates] Error:", error);
    return { success: false, error: (error as Error).message };
  }
}

// =====================================================
// BREAKUP CALCULATORS
// =====================================================

function calculateHotelBreakups(params: {
  rates: any;
  season: any;
  pax: { adults: number; children: number; children_ages: number[] };
  nights: number;
  hotelName: string;
  roomCategory?: string;
  roomId: string;
}): BreakupData[] {
  const { rates, season, pax, nights, hotelName, roomCategory, roomId } = params;
  const breakups: BreakupData[] = [];

  if (!season) return breakups;

  const doubleRate = season.double_pp || 0;
  const singleRate = season.single_pp || 0;
  const extraBedRate = season.extra_bed_pp || 0;
  const roomRate = season.rate_per_night || 0;
  const displayName = roomCategory ? `${hotelName} - ${roomCategory}` : hotelName;

  // Determine pricing model: per-person (double_pp/single_pp) vs per-room (rate_per_night)
  const isPerPersonPricing = doubleRate > 0 || singleRate > 0;

  if (isPerPersonPricing) {
    // Per-person pricing model
    const adultRate = doubleRate || singleRate;

    if (pax.adults > 0 && adultRate > 0) {
      const totalRate = adultRate * nights;
      breakups.push({
        serviceName: `${displayName} - Adult`,
        serviceType: "hotel",
        quantity: pax.adults,
        unitType: "adult",
        ratePerUnit: totalRate,
        baseCost: totalRate * pax.adults,
        finalCost: totalRate * pax.adults,
        calculationNotes: [`${pax.adults} adults x $${adultRate}/night x ${nights} nights = $${totalRate * pax.adults}`],
        roomId: roomId,
        seasonName: season.season_name,
      });
    }

    // Children - use extra_bed rate if available
    if (pax.children > 0 && extraBedRate > 0) {
      const totalRate = extraBedRate * nights;
      breakups.push({
        serviceName: `${displayName} - Child`,
        serviceType: "hotel",
        quantity: pax.children,
        unitType: "child",
        ratePerUnit: totalRate,
        baseCost: totalRate * pax.children,
        finalCost: totalRate * pax.children,
        calculationNotes: [
          `${pax.children} children x $${extraBedRate}/night x ${nights} nights = $${totalRate * pax.children}`,
        ],
        roomId: roomId,
        seasonName: season.season_name,
      });
    }
  } else if (roomRate > 0) {
    // Per-room pricing model (rate_per_night is the total room rate)
    const totalCost = roomRate * nights;
    breakups.push({
      serviceName: `${displayName} - Room`,
      serviceType: "hotel",
      quantity: 1,
      unitType: "room",
      ratePerUnit: roomRate,
      baseCost: totalCost,
      finalCost: totalCost,
      calculationNotes: [`1 room x $${roomRate}/night x ${nights} nights = $${totalCost}`],
      roomId: roomId,
      seasonName: season.season_name,
    });
  }

  return breakups;
}

function calculateTourBreakups(params: {
  rates: any;
  season: any;
  pax: { adults: number; children: number; children_ages: number[] };
  tourName: string;
  packageName?: string;
  packageId: string;
}): BreakupData[] {
  const { rates, season, pax, tourName, packageName, packageId } = params;
  const breakups: BreakupData[] = [];

  if (!season) return breakups;

  const displayName = packageName ? `${tourName} - ${packageName}` : tourName;

  // Adult rate - prefer ticket_only, fallback to sic
  const adultRate = season.ticket_only_rate_adult || season.sic_rate_adult || 0;
  if (pax.adults > 0 && adultRate > 0) {
    breakups.push({
      serviceName: `${displayName} - Adult`,
      serviceType: "tour",
      quantity: pax.adults,
      unitType: "adult",
      ratePerUnit: adultRate,
      baseCost: adultRate * pax.adults,
      finalCost: adultRate * pax.adults,
      calculationNotes: [`${pax.adults} adults x $${adultRate} = $${adultRate * pax.adults}`],
      serviceId: packageId,
      seasonName: season.season_name,
    });
  }

  // Child rate
  const childRate = season.ticket_only_rate_child || season.sic_rate_child || 0;
  if (pax.children > 0 && childRate > 0) {
    breakups.push({
      serviceName: `${displayName} - Child`,
      serviceType: "tour",
      quantity: pax.children,
      unitType: "child",
      ratePerUnit: childRate,
      baseCost: childRate * pax.children,
      finalCost: childRate * pax.children,
      calculationNotes: [`${pax.children} children x $${childRate} = $${childRate * pax.children}`],
      serviceId: packageId,
      seasonName: season.season_name,
    });
  }

  return breakups;
}

function calculateTransferBreakups(params: {
  rates: any;
  season: any;
  pax: { adults: number; children: number; children_ages: number[] };
  transferName: string;
  transferType?: string;
  pickupPoint?: string;
  dropPoint?: string;
  packageId: string;
}): BreakupData[] {
  const { rates, season, pax, transferName, transferType, pickupPoint, dropPoint, packageId } = params;
  const breakups: BreakupData[] = [];

  if (!season) return breakups;

  const serviceContext = pickupPoint && dropPoint ? `${pickupPoint} → ${dropPoint}` : undefined;

  // Check if SIC or PVT based on rates mode or available rates
  const isSIC = rates.mode === "SIC" || (season.sic_rate_adult && season.sic_rate_adult > 0);

  if (isSIC) {
    // SIC - per person rates
    const adultRate = season.sic_rate_adult || 0;
    const childRate = season.sic_rate_child || adultRate; // Fallback to adult rate if no child rate

    if (pax.adults > 0 && adultRate > 0) {
      breakups.push({
        serviceName: `${transferName} - Adult`,
        serviceType: "transfer",
        quantity: pax.adults,
        unitType: "adult",
        ratePerUnit: adultRate,
        baseCost: adultRate * pax.adults,
        finalCost: adultRate * pax.adults,
        calculationNotes: [`${pax.adults} adults x $${adultRate} = $${adultRate * pax.adults}`],
        serviceId: packageId,
        serviceContext,
        seasonName: season.season_name,
      });
    }

    if (pax.children > 0 && childRate > 0) {
      breakups.push({
        serviceName: `${transferName} - Child`,
        serviceType: "transfer",
        quantity: pax.children,
        unitType: "child",
        ratePerUnit: childRate,
        baseCost: childRate * pax.children,
        finalCost: childRate * pax.children,
        calculationNotes: [`${pax.children} children x $${childRate} = $${childRate * pax.children}`],
        serviceId: packageId,
        serviceContext,
        seasonName: season.season_name,
      });
    }
  } else {
    // PVT - per vehicle rate
    const vehicleRate = season.per_vehicle_rate || season.pvt_rate || 0;
    if (vehicleRate > 0) {
      breakups.push({
        serviceName: `${transferName} - Vehicle`,
        serviceType: "transfer",
        quantity: 1,
        unitType: "vehicle",
        ratePerUnit: vehicleRate,
        baseCost: vehicleRate,
        finalCost: vehicleRate,
        calculationNotes: [`1 vehicle x $${vehicleRate} = $${vehicleRate}`],
        serviceId: packageId,
        serviceContext,
        seasonName: season.season_name,
      });
    }
  }

  return breakups;
}

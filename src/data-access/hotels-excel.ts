"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";
import { Hotel } from "@/types/hotels";

interface BulkSaveOptions {
  hotels: Hotel[];
  originalHotelIds?: string[];
  originalRoomIdsByHotel?: Record<string, string[]>;
  newHotelIds?: Set<string> | string[];
  newRoomIds?: Set<string> | string[];
  // For chunked saves: pass all current IDs so deletions work correctly
  allCurrentHotelIds?: string[];
  allCurrentRoomIdsByHotel?: Record<string, string[]>;
}

/**
 * Bulk save hotels from the Excel editor using UPSERT
 * All IDs are real UUIDs (generated client-side)
 * Handles inserts, updates, and deletions for hotels and rooms
 */
export async function bulkSaveHotelsExcel(options: BulkSaveOptions) {
  const {
    hotels,
    originalHotelIds = [],
    originalRoomIdsByHotel = {},
    newHotelIds: rawNewHotelIds = [],
    newRoomIds: rawNewRoomIds = [],
    allCurrentHotelIds,
    allCurrentRoomIdsByHotel,
  } = options;

  // Convert Sets to arrays if needed (Sets don't serialize over server actions)
  const newHotelIds = new Set(Array.isArray(rawNewHotelIds) ? rawNewHotelIds : Array.from(rawNewHotelIds));
  const newRoomIds = new Set(Array.isArray(rawNewRoomIds) ? rawNewRoomIds : Array.from(rawNewRoomIds));

  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return { error: "User not found" };

  try {
    // ========== UPSERT ALL HOTELS ==========
    if (hotels.length > 0) {
      const hotelUpserts = hotels.map((hotel) => {
        return {
          id: hotel.id,
          dmc_id: user.dmc.id,
          created_by: user.id,
          hotel_name: hotel.hotel_name || "",
          hotel_code: hotel.hotel_code || "",
          hotel_address: hotel.hotel_address || "",
          hotel_city: hotel.hotel_city || "",
          hotel_country: hotel.hotel_country || "",
          hotel_state: hotel.hotel_state || null,
          hotel_phone: hotel.hotel_phone || "",
          hotel_email: hotel.hotel_email || "",
          hotel_description: hotel.hotel_description || "",
          hotel_currency: hotel.hotel_currency || "",
          property_type: hotel.property_type || "",
          star_rating: hotel.star_rating || "",
          preferred: hotel.preferred ?? false,
          markup: hotel.markup ?? 0,
          examples: hotel.examples || "",
          offers: hotel.offers || "",
          cancellation_policy: hotel.cancellation_policy || "",
          payment_policy: hotel.payment_policy || "",
          group_policy: hotel.group_policy || "",
          remarks: hotel.remarks || "",
          age_policy: hotel.age_policy || {},
          meal_plan_rates: hotel.meal_plan_rates || [],
          updated_at: new Date().toISOString(),
        };
      });

      const { error: upsertError } = await supabase.from("hotels").upsert(hotelUpserts, { onConflict: "id" });

      if (upsertError) {
        return { error: `Failed to save hotels: ${upsertError.message}` };
      }
    }

    // ========== COLLECT ALL ROOMS FOR UPSERT ==========
    const allRooms: Array<{ id: string; hotel_id: string; [key: string]: any }> = [];

    for (const hotel of hotels) {
      if (hotel.rooms && hotel.rooms.length > 0) {
        for (const room of hotel.rooms) {
          if (!room.id) continue;

          allRooms.push({
            id: room.id,
            hotel_id: hotel.id,
            room_category: room.room_category || "",
            meal_plan: room.meal_plan || "",
            max_occupancy: room.max_occupancy || "",
            other_details: room.other_details || "",
            extra_bed_policy: room.extra_bed_policy || "",
            stop_sale: room.stop_sale || "",
            sort_order: room.sort_order ?? 0,
            seasons: room.seasons || [],
          });
        }
      }
    }

    // ========== UPSERT ALL ROOMS ==========
    if (allRooms.length > 0) {
      const { error: roomUpsertError } = await supabase.from("hotel_rooms").upsert(allRooms, { onConflict: "id" });

      if (roomUpsertError) {
        return { error: `Failed to save rooms: ${roomUpsertError.message}` };
      }
    }

    // ========== DELETE REMOVED HOTELS ==========
    // Use allCurrentHotelIds if provided (for chunked saves), otherwise use current chunk's hotel IDs
    const currentHotelIds = new Set(allCurrentHotelIds || hotels.map((h) => h.id));
    const hotelsToDelete = originalHotelIds.filter((id) => !currentHotelIds.has(id));

    if (hotelsToDelete.length > 0) {
      // First delete rooms for these hotels
      await supabase.from("hotel_rooms").delete().in("hotel_id", hotelsToDelete);

      // Then delete the hotels
      const { error: deleteHotelsError } = await supabase
        .from("hotels")
        .delete()
        .in("id", hotelsToDelete)
        .eq("dmc_id", user.dmc.id);

      if (deleteHotelsError) {
        return { error: `Failed to delete hotels: ${deleteHotelsError.message}` };
      }
    }

    // ========== DELETE REMOVED ROOMS ==========
    // Use allCurrentRoomIdsByHotel if provided (for chunked saves)
    const currentRoomIdsByHotel = new Map<string, Set<string>>();
    if (allCurrentRoomIdsByHotel) {
      // Use the full list from all chunks
      for (const [hotelId, roomIds] of Object.entries(allCurrentRoomIdsByHotel)) {
        currentRoomIdsByHotel.set(hotelId, new Set(roomIds));
      }
    } else {
      // Use current chunk's room IDs
      for (const hotel of hotels) {
        const roomIds = new Set<string>();
        hotel.rooms?.forEach((room) => {
          if (room.id) roomIds.add(room.id);
        });
        currentRoomIdsByHotel.set(hotel.id, roomIds);
      }
    }

    for (const [hotelId, originalRoomIds] of Object.entries(originalRoomIdsByHotel)) {
      // Skip if hotel was deleted
      if (hotelsToDelete.includes(hotelId)) continue;

      const currentIds = currentRoomIdsByHotel.get(hotelId);
      if (!currentIds) continue;

      const roomsToDelete = originalRoomIds.filter((id) => !currentIds.has(id));
      if (roomsToDelete.length > 0) {
        await supabase.from("hotel_rooms").delete().in("id", roomsToDelete).eq("hotel_id", hotelId);
      }
    }

    // ========== RETURN SAVED HOTELS ==========
    // Since we're using real UUIDs, the hotels already have correct IDs
    const savedHotels = hotels.filter((h) => !hotelsToDelete.includes(h.id));

    return {
      data: {
        message: "All changes saved successfully",
        count: hotels.length,
        savedHotels,
      },
    };
  } catch (error) {
    console.error("Error in bulkSaveHotelsExcel:", error);
    return { error: "Failed to save hotel data" };
  }
}

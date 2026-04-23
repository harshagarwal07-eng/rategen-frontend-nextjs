"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";
import { DatastoreSearchParams } from "@/types/datastore";
import { generateEmbeddingsBatch, createHotelSearchText } from "@/lib/embeddings/embedding-utils";
import { SupplierAssociation } from "@/types/suppliers";

export const getAllHotelsByUser = async (params: DatastoreSearchParams) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], totalItems: 0 };

  const { sort, country, city, perPage = 100, page = 1, currency, hotel_name: hotelName } = params;

  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const query = supabase
    .from("hotels")
    .select(
      `
      *,
      countries!hotels_hotel_country_fkey(country_name),
      cities!hotels_hotel_city_fkey(city_name),
      rooms:hotel_rooms(*)
    `,
      { count: "exact" }
    )
    .eq("dmc_id", user.dmc.id)
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    })
    .order("sort_order", { foreignTable: "hotel_rooms", ascending: true })
    .limit(perPage)
    .range(start, end);

  if (country?.length > 0) query.in("hotel_country", country);
  if (city?.length > 0) query.in("hotel_city", city);
  if (currency?.length > 0) query.ilikeAnyOf("hotel_currency", currency);
  if (hotelName) query.ilike("hotel_name", `%${hotelName}%`);

  const { data, error, count } = await query;
  if (error) {
    console.error(`Error fetching hotels for user ${user.id}: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item) => ({
      ...item,
      country_name: item.countries?.country_name || "N/A",
      city_name: item.cities?.city_name || "N/A",
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
};

/**
 * Lightweight hotel fetch for pickers/popovers.
 * Only selects fields needed for display — excludes heavy seasons JSONB from rooms.
 */
export const getHotelsForPicker = async (params: { perPage?: number; page?: number; hotel_name?: string }) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [] };

  const { perPage = 20, page = 1, hotel_name: hotelName } = params;
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const query = supabase
    .from("hotels")
    .select(
      `
      id, hotel_name, property_type, star_rating, preferred,
      hotel_address, hotel_phone, hotel_email, hotel_country, hotel_city,
      countries!hotels_hotel_country_fkey(country_name),
      cities!hotels_hotel_city_fkey(city_name),
      rooms:hotel_rooms(id, room_category, meal_plan, max_occupancy, other_details, sort_order)
    `
    )
    .eq("dmc_id", user.dmc.id)
    .order("created_at", { ascending: false })
    .order("sort_order", { foreignTable: "hotel_rooms", ascending: true })
    .range(start, end);

  if (hotelName) query.ilike("hotel_name", `%${hotelName}%`);

  const { data, error } = await query;
  if (error) {
    console.error(`[getHotelsForPicker] Error: ${error.message}`);
    return { data: [] };
  }

  const transformedData =
    data?.map((item) => ({
      ...item,
      country_name: (item.countries as any)?.country_name || "N/A",
      city_name: (item.cities as any)?.city_name || "N/A",
    })) || [];

  return { data: transformedData };
};

export const createHotels = async (hotel: any) => {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return { error: "User not found" };

  delete hotel.cities;
  delete hotel.countries;
  delete hotel.country_name;
  delete hotel.city_name;

  const { rooms, ...hotelData } = hotel;

  // Insert hotel record
  const { data: hotelRecord, error: hotelError } = await supabase
    .from("hotels")
    .insert({
      ...hotelData,
      created_by: user.id,
      dmc_id: user.dmc.id,
    })
    .select()
    .single();

  if (hotelError) {
    return { error: hotelError.message };
  }

  // Insert room records if provided
  if (rooms && rooms.length > 0) {
    const roomsData = rooms.map((room: any) => ({
      hotel_id: hotelRecord.id,
      room_category: room.room_category,
      meal_plan: room.meal_plan || null,
      max_occupancy: room.max_occupancy || null,
      other_details: room.other_details || null,
      extra_bed_policy: room.extra_bed_policy || null,
      stop_sale: room.stop_sale || null,
      seasons: room.seasons || [],
    }));

    const { error: roomsError } = await supabase.from("hotel_rooms").insert(roomsData);

    if (roomsError) {
      return { error: roomsError.message };
    }
  }

  return { data: hotelRecord };
};

export const updateHotels = async (id: string, hotel: any) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { rooms, ...hotelData } = hotel;

  delete hotelData.cities;
  delete hotelData.countries;
  delete hotelData.country_name;
  delete hotelData.city_name;

  // Update hotel record
  const { data: updatedHotel, error: hotelError } = await supabase
    .from("hotels")
    .update({
      ...hotelData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("dmc_id", user.dmc.id)
    .select()
    .single();

  if (hotelError) return { error: hotelError.message };

  // Handle rooms if provided (for full updates only)
  if (rooms) {
    const roomsResult = await saveHotelRooms(id, rooms);
    if (roomsResult.error) return roomsResult;
  }

  return { data: updatedHotel };
};

// Save only general info for a hotel
export const saveHotelGeneralInfo = async (id: string | undefined, generalInfo: any) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const hotelData = {
    hotel_name: generalInfo.hotel_name,
    hotel_code: generalInfo.hotel_code,
    hotel_address: generalInfo.hotel_address,
    hotel_city: generalInfo.hotel_city,
    hotel_state: generalInfo.hotel_state || null,
    hotel_country: generalInfo.hotel_country,
    hotel_phone: generalInfo.hotel_phone,
    hotel_email: generalInfo.hotel_email,
    hotel_description: generalInfo.hotel_description,
    hotel_currency: generalInfo.hotel_currency,
    property_type: generalInfo.property_type,
    star_rating: generalInfo.star_rating,
    preferred: generalInfo.preferred,
    markup: generalInfo.markup,
    examples: generalInfo.examples,
    offers: generalInfo.offers,
  };

  if (id) {
    // Update existing
    const { data, error } = await supabase
      .from("hotels")
      .update({ ...hotelData, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("dmc_id", user.dmc.id)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  } else {
    // Create new
    const { data, error } = await supabase
      .from("hotels")
      .insert({
        ...hotelData,
        created_by: user.id,
        dmc_id: user.dmc.id,
      })
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  }
};

// Save only policies for a hotel
export const saveHotelPolicies = async (id: string, policies: any) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("hotels")
    .update({
      cancellation_policy: policies.cancellation_policy,
      payment_policy: policies.payment_policy,
      group_policy: policies.group_policy,
      remarks: policies.remarks,
      age_policy: policies.age_policy,
      meal_plan_rates: policies.meal_plan_rates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("dmc_id", user.dmc.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
};

export const saveHotelRooms = async (hotelId: string, rooms: any[]) => {
  const supabase = await createClient();

  if (!rooms || rooms.length === 0) {
    return { error: "At least one room is required" };
  }

  try {
    // Get existing room IDs for this hotel
    const { data: existingRooms, error: fetchError } = await supabase
      .from("hotel_rooms")
      .select("id")
      .eq("hotel_id", hotelId);

    if (fetchError) return { error: fetchError.message };

    const existingRoomIds = existingRooms?.map((r) => r.id) || [];
    const roomsToUpdate: any[] = [];
    const roomsToInsert: any[] = [];
    const incomingRoomIds: string[] = [];

    // Separate rooms into update vs insert based on whether ID exists in DB
    rooms.forEach((room, index) => {
      const roomData = {
        hotel_id: hotelId,
        room_category: room.room_category,
        meal_plan: room.meal_plan || null,
        max_occupancy: room.max_occupancy || null,
        other_details: room.other_details || null,
        extra_bed_policy: room.extra_bed_policy || null,
        stop_sale: room.stop_sale || null,
        sort_order: index,
        seasons: room.seasons || [],
        hotel_room_datastore_id: room.hotel_room_datastore_id || null,
        is_unlinked: room.is_unlinked || false,
      };

      // Check if this room exists in the database
      if (room.id && existingRoomIds.includes(room.id)) {
        // Existing room - update it
        roomsToUpdate.push({ ...roomData, id: room.id });
        incomingRoomIds.push(room.id);
      } else {
        // New room - insert without ID (let DB generate it)
        roomsToInsert.push(roomData);
      }
    });

    // Update existing rooms
    if (roomsToUpdate.length > 0) {
      const { error: updateError } = await supabase.from("hotel_rooms").upsert(roomsToUpdate, {
        onConflict: "id",
      });

      if (updateError) return { error: `Failed to update rooms: ${updateError.message}` };
    }

    // Insert new rooms
    if (roomsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("hotel_rooms").insert(roomsToInsert);

      if (insertError) return { error: `Failed to insert new rooms: ${insertError.message}` };
    }

    // Delete rooms that are no longer present
    const roomIdsToDelete = existingRoomIds.filter((id) => !incomingRoomIds.includes(id));

    if (roomIdsToDelete.length > 0) {
      const { error: deleteError } = await supabase.from("hotel_rooms").delete().in("id", roomIdsToDelete);

      if (deleteError) return { error: `Failed to delete rooms: ${deleteError.message}` };
    }

    // Generate embeddings asynchronously after save completes
    // This runs in the background without blocking the UI
    regenerateHotelRoomEmbeddings(hotelId).catch((err) => {
      console.error("Background embedding regeneration failed:", err);
    });

    return {
      data: {
        message: "Hotel rooms saved successfully",
        updated: roomsToUpdate.length,
        inserted: roomsToInsert.length,
        deleted: roomIdsToDelete.length,
      },
    };
  } catch (error) {
    console.error("Error in saveHotelRooms:", error);
    return { error: "Failed to save hotel rooms" };
  }
};

/**
 * Regenerate embeddings for all rooms of a hotel
 * This runs asynchronously after save to avoid blocking the UI
 */
async function regenerateHotelRoomEmbeddings(hotelId: string): Promise<void> {
  const supabase = await createClient();

  try {
    // Fetch hotel and rooms data needed for embeddings
    const { data: hotel, error: hotelError } = await supabase
      .from("hotels")
      .select(
        `
        hotel_name,
        star_rating,
        countries!hotels_hotel_country_fkey(country_name),
        cities!hotels_hotel_city_fkey(city_name),
        rooms:hotel_rooms(id, room_category, meal_plan)
      `
      )
      .eq("id", hotelId)
      .single();

    if (hotelError || !hotel) {
      console.error("Failed to fetch hotel for embedding regeneration:", hotelError);
      return;
    }

    const rooms = hotel.rooms || [];
    if (rooms.length === 0) return;

    // Create search texts for all rooms
    const searchTexts = rooms.map((room: any) =>
      createHotelSearchText({
        hotel_name: hotel.hotel_name,
        hotel_city: (hotel.cities as any)?.city_name || "",
        hotel_country: (hotel.countries as any)?.country_name || "",
        room_category: room.room_category,
        meal_plan: room.meal_plan,
        star_rating: hotel.star_rating ? parseInt(hotel.star_rating) : undefined,
      })
    );

    // Generate embeddings in batch (efficient API call)
    const embeddings = await generateEmbeddingsBatch(searchTexts);

    // Update each room with its embedding
    const updatePromises = rooms.map((room: any, index: number) =>
      supabase
        .from("hotel_rooms")
        .update({ embedding: JSON.stringify(embeddings[index]) })
        .eq("id", room.id)
    );

    await Promise.all(updatePromises);
    console.log(`Successfully regenerated embeddings for ${rooms.length} rooms of hotel ${hotelId}`);
  } catch (error) {
    console.error("Error regenerating hotel room embeddings:", error);
    // Don't throw - this is a background operation
  }
}

export const getHotelById = async (id: string) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("hotels")
    .select(
      `
      *,
      countries!hotels_hotel_country_fkey(country_name),
      cities!hotels_hotel_city_fkey(city_name),
      rooms:hotel_rooms(*),
      supplier_items:rategen_supplier_items(
        id,
        supplier_id,
        supplier:rategen_suppliers(name, is_active),
        pocs:rategen_supplier_item_pocs(team_member_id, is_primary)
      )
    `
    )
    .eq("id", id)
    .eq("dmc_id", user.dmc.id)
    .order("sort_order", { foreignTable: "hotel_rooms", ascending: true })
    .single();

  if (error) return { error: error.message };

  const supplierAssociations: SupplierAssociation[] = Object.values(
    ((data as any).supplier_items || []).reduce((acc: any, item: any) => {
      const sid = item.supplier_id;
      if (!acc[sid]) {
        acc[sid] = {
          supplier_id: sid,
          supplier_name: item.supplier?.name ?? undefined,
          is_active: item.supplier?.is_active ?? true,
          poc_ids: [],
          primary_poc_id: undefined,
          package_ids: [],
          package_names: {},
        };
      }
      (item.pocs || []).forEach((p: any) => {
        if (!acc[sid].poc_ids.includes(p.team_member_id)) acc[sid].poc_ids.push(p.team_member_id);
        if (p.is_primary) acc[sid].primary_poc_id = p.team_member_id;
      });
      return acc;
    }, {})
  ) as SupplierAssociation[];

  const transformedData = {
    ...data,
    country_name: (data as any).countries?.country_name || "N/A",
    city_name: (data as any).cities?.city_name || "N/A",
    supplier_associations: supplierAssociations,
  };

  return { data: transformedData };
};

export const deleteHotels = async (id: string) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  try {
    // Delete the hotel record (cascade will handle related records)
    const { error } = await supabase.from("hotels").delete().eq("id", id).eq("dmc_id", user.dmc.id);

    if (error) return { error: error.message };

    return { data: null };
  } catch (error) {
    console.error("Error in deleteHotels:", error);
    return { error: "Failed to delete hotel" };
  }
};

export const bulkDeleteHotels = async (ids: string[]) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  try {
    // Delete the hotel records (cascade will handle related records)
    const { error } = await supabase.from("hotels").delete().in("id", ids).eq("dmc_id", user.dmc.id);

    if (error) return { error: error.message };

    return { data: null };
  } catch (error) {
    console.error("Error in bulkDeleteHotels:", error);
    return { error: "Failed to delete hotels" };
  }
};

/**
 * Prepare hotel data for duplication
 * - Fetches full hotel data
 * - Strips all IDs
 * - Returns prepared data ready for form
 */
export const prepareHotelDuplicate = async (hotelId: string) => {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: "User not found" };

  // Fetch full hotel data
  const { data: hotelData, error: fetchError } = await getHotelById(hotelId);
  if (fetchError || !hotelData) {
    return { data: null, error: fetchError || "Hotel not found" };
  }

  try {
    // Deep clone to avoid mutations
    const duplicatedData = JSON.parse(JSON.stringify(hotelData));

    // Remove fields that shouldn't be duplicated
    delete duplicatedData.id;
    delete duplicatedData.created_at;
    delete duplicatedData.updated_at;
    delete duplicatedData.countries;
    delete duplicatedData.cities;
    delete duplicatedData.country_name;
    delete duplicatedData.city_name;
    delete duplicatedData.hotel_datastore_id;
    delete duplicatedData.is_unlinked;

    // Add "(Copy)" suffix to hotel name
    if (duplicatedData.hotel_name) {
      duplicatedData.hotel_name = `${duplicatedData.hotel_name} (Copy)`;
    }

    // Process rooms - remove IDs
    if (duplicatedData.rooms && Array.isArray(duplicatedData.rooms)) {
      duplicatedData.rooms = duplicatedData.rooms.map((room: any) => {
        // Remove room IDs
        const {
          id: _roomId,
          hotel_id: _hotelId,
          embedding: _embedding,
          hotel_room_datastore_id: _hotelRoomDatastoreId,
          is_unlinked: _isUnlinked,
          ...roomWithoutId
        } = room;

        // Remove IDs from seasons
        if (roomWithoutId.seasons && Array.isArray(roomWithoutId.seasons)) {
          roomWithoutId.seasons = roomWithoutId.seasons.map((season: any) => {
            const { id: _seasonId, room_id: _roomRef, ...seasonWithoutId } = season;

            // Remove IDs from booking offers if present
            if (seasonWithoutId.booking_offers && Array.isArray(seasonWithoutId.booking_offers)) {
              seasonWithoutId.booking_offers = seasonWithoutId.booking_offers.map((offer: any) => {
                const { id: _offerId, season_id: _seasonRef, ...offerWithoutId } = offer;
                return offerWithoutId;
              });
            }

            return seasonWithoutId;
          });
        }

        return roomWithoutId;
      });
    }

    // Ensure JSONB fields have defaults
    if (!duplicatedData.amenities) duplicatedData.amenities = [];
    if (!duplicatedData.rooms) duplicatedData.rooms = [];

    return { data: duplicatedData, error: null };
  } catch (error) {
    console.error("Error preparing hotel duplicate:", error);
    return { data: null, error: "Failed to prepare duplicate" };
  }
};

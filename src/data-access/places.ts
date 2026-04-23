"use server";

import { createClient } from "@/utils/supabase/server";
import { CreatePlaceData, Place } from "@/types/places";

export async function createOrUpdatePlace(placeData: CreatePlaceData) {
  const supabase = await createClient();

  const { data: place, error } = await supabase
    .from("places")
    .upsert(
      {
        ...placeData,
        updated_at: new Date().toISOString(),
        last_fetched: new Date().toISOString(),
      },
      {
        onConflict: "place_id", // Specify the unique constraint column
        ignoreDuplicates: false, // Always update on conflict
      }
    )
    .select()
    .single();

  if (error) {
    console.error(`Error upserting place: ${error.message}`);
    return { error: error.message, place: null };
  }

  return { error: null, place };
}

export async function getPlaceById(
  placeId: string
): Promise<{ place: Place | null; error: string | null }> {
  const supabase = await createClient();

  const { data: place, error } = await supabase
    .from("places")
    .select("*")
    .eq("place_id", placeId)
    .single();

  if (error) {
    console.error(`Error fetching place: ${error.message}`);
    return { place: null, error: error.message };
  }

  return { place, error: null };
}

export async function searchPlaces(
  searchTerm: string
): Promise<{ places: Place[]; error: string | null }> {
  const supabase = await createClient();

  const { data: places, error } = await supabase
    .from("places")
    .select("*")
    .or(
      `name.ilike.%${searchTerm}%,formatted_address.ilike.%${searchTerm}%,search_terms.cs.{${searchTerm}}`
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error(`Error searching places: ${error.message}`);
    return { places: [], error: error.message };
  }

  return { places: places || [], error: null };
}

export async function addSearchTermToPlace(
  placeId: string,
  searchTerm: string
) {
  const supabase = await createClient();

  // Get current search terms
  const { data: place } = await supabase
    .from("places")
    .select("search_terms")
    .eq("place_id", placeId)
    .single();

  if (place) {
    const currentTerms = place.search_terms || [];
    const updatedTerms = [
      ...new Set([...currentTerms, searchTerm.toLowerCase()]),
    ];

    const { error } = await supabase
      .from("places")
      .update({
        search_terms: updatedTerms,
        last_fetched: new Date().toISOString(),
      })
      .eq("place_id", placeId);

    if (error) {
      console.error(`Error updating search terms: ${error.message}`);
      return { error: error.message };
    }
  }

  return { error: null };
}

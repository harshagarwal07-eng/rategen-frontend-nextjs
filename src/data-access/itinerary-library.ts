"use server";

import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";

export interface LibraryItem {
  id: string;
  user_id: string;
  dmc_id?: string | null;
  ta_id?: string | null;
  is_public: boolean;
  service_type: "hotel" | "tour" | "transfer" | "meal" | "other";
  name: string;
  city?: string;
  country?: string;
  address?: string;
  phone?: string;
  email?: string;
  images?: string[];
  data: Record<string, any>;
  base_rate?: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLibraryItemInput {
  service_type: LibraryItem["service_type"];
  name: string;
  city?: string;
  country?: string;
  address?: string;
  phone?: string;
  email?: string;
  images?: string[];
  data?: Record<string, any>;
  base_rate?: number;
  currency?: string;
  ta_id?: string;
  is_public?: boolean;
}

export interface SearchLibraryItemsParams {
  service_type?: LibraryItem["service_type"];
  query?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create a new library item
 * Supports both DMC and TA users
 */
export async function createLibraryItem(
  input: CreateLibraryItemInput
): Promise<{ data: LibraryItem | null; error: string | null }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { data: null, error: "User not found" };
  }

  // Determine owner: use provided ta_id, or fallback to user's dmc/ta
  const dmc_id = user.dmc?.id || null;
  const ta_id = input.ta_id || (user as any).ta?.id || null;

  // Must have either dmc_id or ta_id
  if (!dmc_id && !ta_id) {
    return { data: null, error: "User must belong to a DMC or TA" };
  }

  const { data, error } = await supabase
    .from("itinerary_library")
    .insert({
      user_id: user.id,
      dmc_id,
      ta_id,
      is_public: input.is_public || false,
      service_type: input.service_type,
      name: input.name,
      city: input.city || null,
      country: input.country || null,
      address: input.address || null,
      phone: input.phone || null,
      email: input.email || null,
      images: input.images || [],
      data: input.data || {},
      base_rate: input.base_rate || null,
      currency: input.currency || "USD",
    })
    .select()
    .single();

  if (error) {
    console.error("[createLibraryItem] Error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as LibraryItem, error: null };
}

/**
 * Get library items for the current user's DMC or TA
 * Uses view to resolve city/country UUIDs to names
 * RLS policies handle access control
 */
export async function getLibraryItems(
  params: SearchLibraryItemsParams = {}
): Promise<{ data: LibraryItem[]; error: string | null }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { data: [], error: "User not found" };
  }

  const { service_type, query, limit = 50, offset = 0 } = params;

  // Use view to get resolved city/country names
  let queryBuilder = supabase
    .from("vw_itinerary_library")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (service_type) {
    queryBuilder = queryBuilder.eq("service_type", service_type);
  }

  if (query) {
    queryBuilder = queryBuilder.ilike("name", `%${query}%`);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error("[getLibraryItems] Error:", error);
    return { data: [], error: error.message };
  }

  return { data: (data || []) as LibraryItem[], error: null };
}

/**
 * Search library items with fuzzy matching
 * Uses view to resolve city/country UUIDs to names
 * RLS policies handle access control
 */
export async function searchLibraryItems(
  params: SearchLibraryItemsParams
): Promise<{ data: LibraryItem[]; error: string | null }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { data: [], error: "User not found" };
  }

  const { service_type, query, limit = 20, offset = 0 } = params;

  // Use view to get resolved city/country names
  let queryBuilder = supabase
    .from("vw_itinerary_library")
    .select("*")
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (service_type) {
    queryBuilder = queryBuilder.eq("service_type", service_type);
  }

  if (query) {
    // Search in name, city, and country (resolved names from view)
    queryBuilder = queryBuilder.or(
      `name.ilike.%${query}%,city.ilike.%${query}%,country.ilike.%${query}%`
    );
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error("[searchLibraryItems] Error:", error);
    return { data: [], error: error.message };
  }

  return { data: (data || []) as LibraryItem[], error: null };
}

/**
 * Get a single library item by ID
 * Uses view to resolve city/country UUIDs to names
 */
export async function getLibraryItemById(
  id: string
): Promise<{ data: LibraryItem | null; error: string | null }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { data: null, error: "User not found" };
  }

  // Use view to get resolved city/country names
  const { data, error } = await supabase
    .from("vw_itinerary_library")
    .select("*")
    .eq("id", id)
    .eq("dmc_id", user.dmc.id)
    .single();

  if (error) {
    console.error("[getLibraryItemById] Error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as LibraryItem, error: null };
}

/**
 * Update a library item
 */
export async function updateLibraryItem(
  id: string,
  updates: Partial<CreateLibraryItemInput>
): Promise<{ data: LibraryItem | null; error: string | null }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { data: null, error: "User not found" };
  }

  const { data, error } = await supabase
    .from("itinerary_library")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id) // Only allow updating own items
    .select()
    .single();

  if (error) {
    console.error("[updateLibraryItem] Error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as LibraryItem, error: null };
}

/**
 * Delete a library item
 */
export async function deleteLibraryItem(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "User not found" };
  }

  const { error } = await supabase
    .from("itinerary_library")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id); // Only allow deleting own items

  if (error) {
    console.error("[deleteLibraryItem] Error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Car on Disposal Search Utilities
 *
 * Search functions for Car on Disposal packages (daily vehicle rentals).
 * These are stored in a separate table from regular transfers.
 */

import { createClient } from "@/utils/supabase/server";
import type { CarOnDisposal } from "@/types/car-on-disposal";

export interface CarOnDisposalSearchResult {
  id: string;
  name: string;
  brand: string;
  capacity: number;
  country: string;
  currency: string;
  vbp_rate: number; // Daily rate (Vehicle Basis Package)
  max_hrs_per_day: number;
  preferred: boolean;
  remarks?: string;
}

export interface CarOnDisposalSelection {
  car_on_disposal_id: string;
  name: string;
  brand: string;
  capacity: number;
  daily_rate: number;
  currency: string;
  max_hours: number;
  rate_data: CarOnDisposal;
}

/**
 * Search for Car on Disposal packages by destination/country
 *
 * @param dmc_id - DMC UUID
 * @param countryCode - Country code (e.g., "MU" for Mauritius)
 * @param partySize - Number of passengers (to filter by capacity)
 * @returns Array of matching Car on Disposal packages
 */
export async function searchCarOnDisposal(
  dmc_id: string,
  countryCode: string,
  partySize?: number
): Promise<CarOnDisposalSearchResult[]> {
  console.log(`[CarOnDisposalSearch] Searching for country: ${countryCode}, party: ${partySize || "any"}`);

  const supabase = await createClient();

  let query = supabase
    .from("car_on_disposals")
    .select("*")
    .eq("dmc_id", dmc_id)
    .eq("country", countryCode)
    .order("preferred", { ascending: false })
    .order("capacity", { ascending: true });

  // If party size specified, filter by capacity
  if (partySize) {
    query = query.gte("capacity", partySize);
  }

  const { data, error } = await query.limit(10);

  if (error) {
    console.error(`[CarOnDisposalSearch] Error: ${error.message}`);
    return [];
  }

  if (!data || data.length === 0) {
    console.log(`[CarOnDisposalSearch] No Car on Disposal found for ${countryCode}`);
    return [];
  }

  console.log(`[CarOnDisposalSearch] Found ${data.length} packages`);

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    brand: item.brand,
    capacity: item.capacity,
    country: item.country,
    currency: item.currency,
    vbp_rate: item.vbp_rate,
    max_hrs_per_day: item.max_hrs_per_day,
    preferred: item.preferred,
    remarks: item.remarks,
  }));
}

/**
 * Select the best Car on Disposal based on party size
 *
 * Selection logic:
 * 1. Filter by capacity >= party size
 * 2. Prefer preferred packages
 * 3. Select smallest vehicle that fits (to minimize cost)
 */
export async function selectBestCarOnDisposal(
  dmc_id: string,
  countryCode: string,
  partySize: number
): Promise<CarOnDisposalSelection | null> {
  const packages = await searchCarOnDisposal(dmc_id, countryCode, partySize);

  if (packages.length === 0) {
    return null;
  }

  // Find the best match:
  // 1. Preferred packages first
  // 2. Smallest capacity that fits
  const preferred = packages.filter((p) => p.preferred);
  const bestMatch = preferred.length > 0 ? preferred[0] : packages[0];

  console.log(`[CarOnDisposalSearch] Selected: ${bestMatch.name} (capacity: ${bestMatch.capacity})`);

  // Fetch full details
  const supabase = await createClient();
  const { data: fullDetails } = await supabase
    .from("car_on_disposals")
    .select("*")
    .eq("id", bestMatch.id)
    .single();

  return {
    car_on_disposal_id: bestMatch.id,
    name: bestMatch.name,
    brand: bestMatch.brand,
    capacity: bestMatch.capacity,
    daily_rate: bestMatch.vbp_rate,
    currency: bestMatch.currency,
    max_hours: bestMatch.max_hrs_per_day,
    rate_data: fullDetails as CarOnDisposal,
  };
}

/**
 * Fetch full Car on Disposal details by ID
 */
export async function fetchCarOnDisposalDetails(
  id: string
): Promise<CarOnDisposal | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("car_on_disposals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error(`[CarOnDisposalSearch] Fetch error: ${error?.message}`);
    return null;
  }

  return data as CarOnDisposal;
}

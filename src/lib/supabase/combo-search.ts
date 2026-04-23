/**
 * Combo Search Functions
 *
 * Search for combo packages (bundled tours/transfers) using text and vector similarity.
 *
 * Flow:
 * 1. First search combos by text/vector
 * 2. If match found → use combo (skip individual tour/transfer search)
 * 3. If no match → fall back to individual services
 *
 * This module follows the same pattern as vector-search.ts for consistency.
 */

import { createClient } from "@/utils/supabase/server";

// =====================================================
// TYPES
// =====================================================

export interface ComboSearchResult {
  combo_id: string;
  title: string;
  description: string | null;
  remarks: string | null;
  country_code: string | null;
  item_count: number;
  package_names: string | null;
  similarity_score: number;
  // Combo matching logic fields (only applicable for OR combos)
  combo_type: "AND" | "OR"; // AND = all packages required, OR = user can choose packages
  min_packages: number; // Minimum packages required (for OR combos only)
  max_packages?: number; // Maximum packages allowed (for OR combos only, undefined = no limit)
}

export interface ComboItem {
  item_id: string;
  item_type: "tour" | "transfer";
  tour_id: string | null;
  transfer_id: string | null;
  tour_package_id: string | null;
  transfer_package_id: string | null;
  package_name: string;
  order: number;
}

export interface ComboSeason {
  season_id: string;
  dates: string | null;
  blackout_dates: string | null;
  exception_rules: string | null;
  order: number;
  ticket_only_rate_adult: number | null;
  ticket_only_rate_child: number | null;
  ticket_only_rate_teenager: number | null;
  ticket_only_rate_infant: number | null;
  sic_rate_adult: number | null;
  sic_rate_child: number | null;
  sic_rate_teenager: number | null;
  sic_rate_infant: number | null;
  pvt_rate: Record<string, any> | null;
  per_vehicle_rate: Record<string, any>[] | null;
  total_rate: number | null;
}

export interface ComboFullDetails {
  combo_id: string;
  title: string;
  description: string | null;
  remarks: string | null;
  age_policy: Record<string, any> | null;
  currency: string;
  dmc_id: string;
  country_code: string | null;
  country_name: string | null;
  city_name: string | null;
  items: ComboItem[];
  seasons: ComboSeason[];
  item_count: number;
  package_names_display: string | null;
  created_at: string;
  updated_at: string;
  // Combo matching logic fields (only applicable for OR combos)
  combo_type: "AND" | "OR"; // AND = all packages required, OR = user can choose packages
  min_packages: number; // Minimum packages required (for OR combos only)
  max_packages?: number; // Maximum packages allowed (for OR combos only, undefined = no limit)
}

export interface ComboSelection {
  combo_id: string;
  title: string;
  description: string | null;
  package_names: string | null;
  items: ComboItem[];
  assigned_day?: number;
  rate_data?: ComboFullDetails;
}

// =====================================================
// SEARCH FUNCTIONS
// =====================================================

/**
 * Stage 1: Search combos by text (title, description, package names)
 *
 * Uses PostgreSQL text search with fuzzy matching.
 *
 * @param dmc_id - DMC ID to filter combos
 * @param query - Search query (e.g., "Undersea Walk", "Ile Aux Cerf package")
 * @param countryCode - Optional country code filter
 * @param limit - Maximum number of results
 * @returns Array of matching combos with similarity scores
 */
export async function searchCombosByText(
  dmc_id: string,
  query: string,
  countryCode?: string,
  limit: number = 10
): Promise<ComboSearchResult[]> {
  console.log(`[ComboSearch] Stage 1: Searching combos for query: "${query}"`);
  console.log(`[ComboSearch] DMC: ${dmc_id}, Country: ${countryCode || "any"}`);

  const supabase = await createClient(true);

  try {
    const { data, error } = await supabase.rpc("search_combos_by_text", {
      p_search_query: query,
      p_dmc_id: dmc_id,
      p_country_code: countryCode || null,
      p_limit: limit,
    });

    if (error) {
      console.error("[ComboSearch] Text search error:", error);
      // Fallback to direct query if RPC not available
      return await searchCombosDirectQuery(dmc_id, query, countryCode, limit);
    }

    console.log(`[ComboSearch] Stage 1: Found ${data?.length || 0} combos`);
    return data || [];
  } catch (error) {
    console.error("[ComboSearch] Stage 1 error:", error);
    return [];
  }
}

/**
 * Sanitize query for Supabase PostgREST filters
 * Removes special characters that break the .or() filter syntax
 */
function sanitizeQueryForFilter(query: string): string {
  // Remove parentheses, brackets, and other special PostgREST characters
  // Keep only alphanumeric, spaces, and basic punctuation
  return query
    .replace(/[()[\]{}]/g, "") // Remove brackets/parens
    .replace(/[,]/g, " ") // Replace commas with spaces
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

/**
 * Extract searchable keywords from query
 * Focuses on tour/service names rather than full query
 */
function extractSearchTerms(query: string): string[] {
  const sanitized = sanitizeQueryForFilter(query);

  // Look for common patterns like "X tour", "X package", "X island"
  const terms: string[] = [];

  // Extract tour/package related phrases
  const patterns = [
    /(\w+\s+island\s+tour)/gi,
    /(\w+\s+tour)/gi,
    /(\w+\s+package)/gi,
    /(undersea\s+walk)/gi,
    /(ile\s+aux\s+cerf)/gi,
  ];

  for (const pattern of patterns) {
    const matches = sanitized.match(pattern);
    if (matches) {
      terms.push(...matches.map((m) => m.trim()));
    }
  }

  // If no specific patterns found, use sanitized query
  if (terms.length === 0) {
    return [sanitized];
  }

  // Deduplicate
  return [...new Set(terms)];
}

/**
 * Fallback: Direct query if RPC function not available
 */
async function searchCombosDirectQuery(
  dmc_id: string,
  query: string,
  countryCode?: string,
  limit: number = 10
): Promise<ComboSearchResult[]> {
  console.log("[ComboSearch] Using direct query fallback");

  const supabase = await createClient(true);

  try {
    // Sanitize query for safe use in filters
    const sanitizedQuery = sanitizeQueryForFilter(query);

    if (!sanitizedQuery) {
      console.log("[ComboSearch] Empty query after sanitization");
      return [];
    }

    let queryBuilder = supabase.from("vw_combos_search").select("*").eq("dmc_id", dmc_id);

    if (countryCode) {
      queryBuilder = queryBuilder.eq("country_code", countryCode);
    }

    // Search in title, description, and package names with sanitized query
    queryBuilder = queryBuilder.or(
      `title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%,package_names.ilike.%${sanitizedQuery}%`
    );

    const { data, error } = await queryBuilder.limit(limit);

    if (error) {
      console.error("[ComboSearch] Direct query error:", error);
      return [];
    }

    // Add similarity score placeholder and ensure combo_type/min_packages have defaults
    // If DB doesn't return combo_type, detect from title pattern
    return (data || []).map((combo) => {
      const detected = !combo.combo_type ? detectComboTypeFromTitle(combo.title) : null;
      return {
        ...combo,
        similarity_score: 0.5, // Placeholder
        combo_type: combo.combo_type || detected?.combo_type || "AND",
        min_packages: combo.min_packages ?? detected?.min_packages ?? 2,
        max_packages: combo.max_packages, // undefined = no limit
      };
    });
  } catch (error) {
    console.error("[ComboSearch] Direct query error:", error);
    return [];
  }
}

/**
 * Stage 2: Search combos by vector similarity
 *
 * Uses pgvector for semantic search on combo embeddings.
 *
 * @param dmc_id - DMC ID to filter combos
 * @param query - Search query
 * @param countryCode - Optional country code filter
 * @param matchThreshold - Minimum similarity score (0-1)
 * @param limit - Maximum number of results
 * @returns Array of matching combos with similarity scores
 */
export async function searchCombosByVector(
  dmc_id: string,
  query: string,
  countryCode?: string,
  matchThreshold: number = 0.5,
  limit: number = 10
): Promise<ComboSearchResult[]> {
  console.log(`[ComboSearch] Vector search: query="${query}", threshold=${matchThreshold}`);

  const supabase = await createClient(true);

  try {
    // Generate embedding for the query
    const { data: queryEmbedding, error: embeddingError } = await supabase.rpc("generate_embedding", {
      input_text: query,
    });

    if (embeddingError || !queryEmbedding) {
      console.error("[ComboSearch] Embedding generation error:", embeddingError);
      // Fallback to text search
      return await searchCombosByText(dmc_id, query, countryCode, limit);
    }

    // Vector search
    const { data, error } = await supabase.rpc("search_combos_by_vector", {
      p_query_embedding: queryEmbedding,
      p_dmc_id: dmc_id,
      p_country_code: countryCode || null,
      p_match_threshold: matchThreshold,
      p_limit: limit,
    });

    if (error) {
      console.error("[ComboSearch] Vector search error:", error);
      // Fallback to text search
      return await searchCombosByText(dmc_id, query, countryCode, limit);
    }

    console.log(`[ComboSearch] Vector search: Found ${data?.length || 0} combos`);
    return data || [];
  } catch (error) {
    console.error("[ComboSearch] Vector search error:", error);
    return [];
  }
}

/**
 * Hybrid search: Combines text and vector search
 *
 * First tries exact text match, then vector similarity.
 * Returns deduplicated results sorted by relevance.
 *
 * IMPORTANT: Merges results preferring the one with more complete data
 * (especially remarks field which is needed for validation).
 */
export async function searchCombosHybrid(
  dmc_id: string,
  query: string,
  countryCode?: string,
  limit: number = 10
): Promise<ComboSearchResult[]> {
  console.log(`[ComboSearch] Hybrid search for: "${query}"`);

  // Run both searches in parallel
  const [textResults, vectorResults] = await Promise.all([
    searchCombosByText(dmc_id, query, countryCode, limit),
    searchCombosByVector(dmc_id, query, countryCode, 0.5, limit),
  ]);

  console.log(`[ComboSearch] Text search returned ${textResults.length} results`);
  console.log(`[ComboSearch] Vector search returned ${vectorResults.length} results`);

  // Create a map for quick lookup and merging
  const comboMap = new Map<string, ComboSearchResult>();

  // First add text results (they have complete data including remarks)
  for (const result of textResults) {
    comboMap.set(result.combo_id, result);
    if (result.remarks) {
      console.log(`[ComboSearch] Combo "${result.title}" has remarks: ${result.remarks.substring(0, 100)}...`);
    }
  }

  // Add vector matches, but merge with existing data if combo already exists
  for (const result of vectorResults) {
    const existing = comboMap.get(result.combo_id);
    if (existing) {
      // Combo already found by text search - keep the more complete one (text result)
      // But take the higher similarity score
      if (result.similarity_score > existing.similarity_score) {
        existing.similarity_score = result.similarity_score;
      }
    } else {
      // New combo from vector search - add it
      // Log warning if remarks are missing (indicates old SQL function)
      if (!result.remarks) {
        console.log(`[ComboSearch] ⚠️ Vector result "${result.title}" missing remarks field`);
      }
      comboMap.set(result.combo_id, result);
    }
  }

  // Convert map to array and sort by similarity score
  const merged = Array.from(comboMap.values());
  merged.sort((a, b) => b.similarity_score - a.similarity_score);

  // Apply combo_type detection from title if not provided by DB
  const withDetection = merged.map((combo) => {
    if (!combo.combo_type || combo.combo_type === "AND") {
      const detected = detectComboTypeFromTitle(combo.title);
      if (detected.combo_type === "OR") {
        return {
          ...combo,
          combo_type: detected.combo_type,
          min_packages: detected.min_packages,
        };
      }
    }
    return combo;
  });

  console.log(`[ComboSearch] Hybrid search: ${withDetection.length} unique combos after merge`);

  return withDetection.slice(0, limit);
}

// =====================================================
// DETAILS FUNCTIONS
// =====================================================

/**
 * Fetch full combo details for rate calculation
 *
 * @param combo_id - UUID of the combo
 * @returns Complete combo details with items and seasons
 */
export async function fetchComboFullDetails(combo_id: string): Promise<ComboFullDetails | null> {
  console.log(`[ComboSearch] Fetching full details for combo: ${combo_id}`);

  const supabase = await createClient(true);

  try {
    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_combo_full_details", { p_combo_id: combo_id });

    if (!rpcError && rpcData) {
      return parseComboDetails(rpcData);
    }

    // Fallback to direct view query
    const { data, error } = await supabase.from("vw_combos_full").select("*").eq("combo_id", combo_id).single();

    if (error) {
      console.error("[ComboSearch] Error fetching combo details:", error);
      return null;
    }

    return parseComboDetails(data);
  } catch (error) {
    console.error("[ComboSearch] Error fetching combo details:", error);
    return null;
  }
}

/**
 * Fetch details for multiple combos in parallel
 */
export async function fetchMultipleComboDetails(combo_ids: string[]): Promise<ComboFullDetails[]> {
  console.log(`[ComboSearch] Fetching details for ${combo_ids.length} combos`);

  const results = await Promise.all(combo_ids.map((id) => fetchComboFullDetails(id)));

  return results.filter((r): r is ComboFullDetails => r !== null);
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Parse combo details from database response
 */
function parseComboDetails(data: any): ComboFullDetails {
  return {
    combo_id: data.combo_id,
    title: data.title,
    description: data.description,
    remarks: data.remarks,
    age_policy: parseJson(data.age_policy),
    currency: data.currency || "USD",
    dmc_id: data.dmc_id,
    country_code: data.country_code,
    country_name: data.country_name,
    city_name: data.city_name,
    items: parseJson(data.items) || [],
    seasons: parseJson(data.seasons) || [],
    item_count: data.item_count || 0,
    package_names_display: data.package_names_display,
    created_at: data.created_at,
    updated_at: data.updated_at,
    // Combo matching logic fields - detect from title if not in DB
    ...(() => {
      const detected = !data.combo_type ? detectComboTypeFromTitle(data.title) : null;
      return {
        combo_type: data.combo_type || detected?.combo_type || "AND",
        min_packages: data.min_packages ?? detected?.min_packages ?? 2,
        max_packages: data.max_packages, // undefined = no limit
      };
    })(),
  };
}

/**
 * Detect combo_type and min_packages from title when DB doesn't return them
 * Pattern: "[Min X" in title indicates OR combo with min X packages
 * Example: "Mauritius Combo [Airport Transfers + Tours] - SIC [Min 2 Services]"
 */
function detectComboTypeFromTitle(title: string): { combo_type: "AND" | "OR"; min_packages: number } {
  // Look for "[Min X" pattern in title
  const minMatch = title.match(/\[Min\s*(\d+)/i);
  if (minMatch) {
    const minPackages = parseInt(minMatch[1], 10);
    console.log(`[ComboSearch] Detected OR combo from title: "${title}" (min_packages: ${minPackages})`);
    return { combo_type: "OR", min_packages: minPackages };
  }

  // Default to AND with min 2
  return { combo_type: "AND", min_packages: 2 };
}

/**
 * Safely parse JSON (handles strings and objects)
 */
function parseJson(value: any): any {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Check if a combo matches the requested services
 *
 * Used to validate that a combo contains the tours/transfers the user asked for.
 *
 * @param combo - Combo details
 * @param requestedServices - Array of service names/keywords to match
 * @returns true if combo contains all requested services
 */
export function comboMatchesRequest(combo: ComboFullDetails, requestedServices: string[]): boolean {
  const comboPackageNames = combo.items.map((item) => item.package_name.toLowerCase());

  return requestedServices.every((service) =>
    comboPackageNames.some((name) => name.includes(service.toLowerCase()) || service.toLowerCase().includes(name))
  );
}

/**
 * Get combo rate for a specific season/date
 *
 * @param combo - Combo details
 * @param checkInDate - Check-in date to find applicable season
 * @returns Applicable season with rates, or null if no match
 */
export function getComboSeasonRate(combo: ComboFullDetails, checkInDate?: string): ComboSeason | null {
  if (!combo.seasons || combo.seasons.length === 0) {
    return null;
  }

  // If no date specified, return first season
  if (!checkInDate) {
    return combo.seasons[0];
  }

  // Find applicable season based on date
  // For now, return first season (TODO: implement date matching)
  // TODO: Parse dates field and blackout_dates to find correct season
  return combo.seasons[0];
}

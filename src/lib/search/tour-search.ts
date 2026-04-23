/**
 * Tour Search Utilities
 *
 * Shared tour search functions for the itinerary pipeline.
 * Extracted from tour-agent.ts for reuse across agents.
 *
 * Two search patterns:
 * 1. Direct package search - best for specific tour names
 * 2. Three-stage search - for broader queries
 */

import {
  searchTourPackagesDirect,
  fetchTourPackageDetailsForQuote,
  type DirectPackageSearchResult,
} from "@/lib/supabase/vector-search";
import { getInternalLLM } from "@/lib/utils/model-config";
import { z } from "zod";
import type { VwToursPackage } from "@/types/database";
import type { SearchOptions, TourSearchResult, TourSelection, LLMSelectionResult, SelectionContext } from "./types";

// =====================================================
// SEARCH FUNCTIONS
// =====================================================

/**
 * Search for tour packages by name using vector similarity
 *
 * Uses direct package search (no grouping by tour)
 * Returns ALL relevant results - LLM handles selection
 *
 * @param dmc_id - DMC UUID
 * @param query - User's search query
 * @param options - Search options (limit defaults to 15 for LLM to have good options)
 * @returns Array of package matches - pass directly to LLM for selection
 */
export async function searchTours(
  dmc_id: string,
  query: string,
  options: SearchOptions = {}
): Promise<TourSearchResult[]> {
  // Higher limit to give LLM more options - LLM will pick the best one
  const { limit = 15 } = options;

  console.log(`[TourSearch] Searching tours for: "${query}"`);

  try {
    const results = await searchTourPackagesDirect(dmc_id, query, { limit });

    console.log(`[TourSearch] Vector search found ${results.length} results`);

    // Map to shared type - NO filtering, pass all to LLM
    return results.map((r: DirectPackageSearchResult) => ({
      package_id: r.package_id,
      package_name: r.package_name,
      tour_id: r.tour_id,
      tour_name: r.tour_name,
      description: r.description,
      package_remarks: r.package_remarks,
      includes_transfer: r.includes_transfer,
      preferred: r.preferred,
      iscombo: r.iscombo,
      duration: r.duration,
      city: r.city,
      country: r.country,
      currency: r.currency,
      similarity: r.similarity,
    }));
  } catch (error) {
    console.error(`[TourSearch] Vector search failed:`, (error as Error).message);
    return [];
  }
}

// NOTE: Removed searchToursText - vector search with lower threshold (0.3) is sufficient
// LLM-based selection (selectBestTour) handles quality filtering

/**
 * Search for tours with destination prepended for better results
 *
 * When searching for "undersea walk" in Mauritius, this searches
 * "Mauritius undersea walk" for better vector matching.
 *
 * @param dmc_id - DMC UUID
 * @param query - User's search query
 * @param destination - Destination to prepend
 * @param options - Search options
 */
export async function searchToursWithDestination(
  dmc_id: string,
  query: string,
  destination: string,
  options: SearchOptions = {}
): Promise<TourSearchResult[]> {
  // Prepend destination if not already in query
  const queryLower = query.toLowerCase();
  const destLower = destination.toLowerCase();

  const searchQuery = queryLower.includes(destLower) ? query : `${destination} ${query}`;

  return searchTours(dmc_id, searchQuery, options);
}

/**
 * Travelers info for optimal variant selection
 */
export interface TravelersInfo {
  adults: number;
  children: number;
  children_ages: number[];
}

/**
 * Use LLM to select the best tour package from search results
 *
 * When travelers info is provided, fetches details for ALL top results
 * and lets LLM select optimal based on age_policy + rates + pax in ONE call.
 * LLM handles everything: identifying variants, applying age_policy, calculating costs.
 *
 * @param results - Tour search results
 * @param context - Selection context
 * @param travelers - Optional travelers info for optimal variant selection
 * @returns Best tour selection with reasoning
 */
export async function selectBestTour(
  results: TourSearchResult[],
  context: SelectionContext,
  travelers?: TravelersInfo
): Promise<LLMSelectionResult<TourSearchResult>> {
  if (results.length === 0) {
    return {
      selection: null,
      alternatives: [],
      reasoning: "No tours found matching the query",
      tokens_used: 0,
    };
  }

  if (results.length === 1) {
    return {
      selection: results[0],
      alternatives: [],
      reasoning: "Single tour match",
      tokens_used: 0,
    };
  }

  const llm = getInternalLLM(0); // temperature=0 for deterministic

  // Fetch details for ALL top results (up to 5) when travelers info is provided
  // LLM will identify variants and select optimal - no manual filtering
  const packageDetails: Map<string, any> = new Map();
  if (travelers && results.length > 1) {
    const topResults = results.slice(0, 5);
    const detailsPromises = topResults.map(async (t) => {
      const details = await fetchTourDetails(t.package_id);
      return { package_id: t.package_id, details };
    });

    const detailsResults = await Promise.all(detailsPromises);
    for (const { package_id, details } of detailsResults) {
      if (details) {
        packageDetails.set(package_id, details);
      }
    }
  }

  // Build tour list with full details for ALL packages (LLM decides what's relevant)
  const tourList = results
    .map((t, i) => {
      const duration = t.duration ? `${t.duration.hours || 0}h ${t.duration.minutes || 0}m` : "N/A";
      const remarks = t.package_remarks ? ` | Includes: ${t.package_remarks.substring(0, 100)}` : "";

      let detailsInfo = "";
      const details = packageDetails.get(t.package_id);
      if (details) {
        // Add age_policy for LLM to apply
        const agePolicy = details.age_policy
          ? (typeof details.age_policy === "string" ? JSON.parse(details.age_policy) : details.age_policy)
          : null;

        if (agePolicy) {
          const agePolicyStr = Object.entries(agePolicy)
            .map(([cat, range]: [string, any]) => `${cat}:${range.min_age}-${range.max_age}`)
            .join(", ");
          detailsInfo += ` | Age Policy: [${agePolicyStr}]`;
        }

        // Add rate info from seasons for LLM to calculate costs
        if (details.seasons && details.seasons.length > 0) {
          const season = details.seasons[0];
          const rates: string[] = [];
          if (season.sic_rate_adult) rates.push(`Adult:$${season.sic_rate_adult}`);
          if (season.sic_rate_child) rates.push(`Child:$${season.sic_rate_child}`);
          if (season.sic_rate_teenager) rates.push(`Teen:$${season.sic_rate_teenager}`);
          if (season.total_rate) rates.push(`Per Unit:$${season.total_rate}`);
          if (rates.length > 0) detailsInfo += ` | Rates: [${rates.join(", ")}]`;
        }
      }

      return `${i + 1}. ${t.package_name} [Tour: ${t.tour_name}] (${duration}, ${t.includes_transfer ? "INCL. TRANSFER" : "no transfer"}${
        t.preferred ? ", PREFERRED" : ""
      })${remarks}${detailsInfo}`;
    })
    .join("\n");

  const SelectionSchema = z.object({
    selected_number: z.number().describe("Number of the selected tour (1-indexed)"),
    reasoning: z.string().describe("Brief explanation including cost calculation if variants exist"),
  });

  // Build pax context if travelers provided - LLM does ALL the work
  let paxContext = "";
  if (travelers) {
    const childAgesStr = travelers.children_ages.length > 0
      ? `(ages: ${travelers.children_ages.join(", ")})`
      : "";
    paxContext = `
PAX DETAILS: ${travelers.adults} Adults + ${travelers.children} Children ${childAgesStr}

VARIANT SELECTION RULES (LLM must apply these):
1. IDENTIFY VARIANTS: Look for packages with same base name but different basis (Single/Double/Per Person/Per Vehicle)
2. APPLY AGE POLICY: For each variant, classify each traveler using its Age Policy
   - Example: Age Policy [adult:12-99, child:4-11] → 16yo = adult, 8yo = child, 3yo = excluded
3. COUNT ELIGIBLE: Sum up how many travelers qualify under each variant's policy
4. CALCULATE UNITS:
   - "Single basis" or "Per Person": units = eligible count
   - "Double basis" or "Per Pair": units = ceil(eligible count / 2)
   - "Per Vehicle": units = 1 (usually)
5. CALCULATE TOTAL COST: units × rate
6. SELECT OPTIMAL: Pick the variant with LOWEST TOTAL COST for this party
`;
  }

  const prompt = `Select the best tour package for this request.

USER REQUEST: "${context.query}"
PARTY: ${context.party_size || "Not specified"}
TOUR BASIS: ${context.tour_basis || "Not specified"}
${paxContext}
AVAILABLE PACKAGES:
${tourList}

SELECTION RULES:
1. ⚠️ SELECT ONLY ONE - Return the SINGLE best match
2. EXACT NAME MATCH is highest priority:
   - "Nepalese Bridge" → select package with "Nepalese Bridge" in name
   - "Quad Adventure" → select package with "Quad" in name
3. QUANTITY/DURATION MATCHING:
   - "2 Luge Rides" → select "2 Rides" variant, NOT "3 Rides"
   - "25-Minute Seaplane" → select "25-Minute", NOT "15-Minute"
4. Use "Includes:" remarks to verify package contents match request
5. If package has INCL. TRANSFER, note it (no separate transfer needed)
6. Prefer PREFERRED packages when match quality is similar
7. When VARIANTS exist (same tour, different basis), CALCULATE costs for each and pick LOWEST COST

Select ONE package number.`;

  try {
    const structured = llm.withStructuredOutput(SelectionSchema, { includeRaw: true });
    const response = await structured.invoke(prompt);
    const result = response.parsed;

    // Handle null response from LLM
    if (!result) {
      console.error("[TourSearch] LLM returned null response");
      // Fallback: return first result (highest similarity)
      return {
        selection: results[0],
        alternatives: results.slice(1, 3),
        reasoning: "Fallback to highest similarity match (LLM returned null)",
        tokens_used: 0,
      };
    }

    const tokens =
      (response.raw as any).usage_metadata?.total_tokens ||
      (response.raw as any).response_metadata?.usage?.total_tokens ||
      0;

    const selectedIndex = result.selected_number - 1;
    const selection = results[selectedIndex] || results[0];
    const alternatives = results.filter((_, i) => i !== selectedIndex).slice(0, 2);

    return {
      selection,
      alternatives,
      reasoning: result.reasoning,
      tokens_used: tokens,
    };
  } catch (error) {
    console.error("[TourSearch] LLM selection error:", error);
    // Fallback: return first result (highest similarity)
    return {
      selection: results[0],
      alternatives: results.slice(1, 3),
      reasoning: "Fallback to highest similarity match",
      tokens_used: 0,
    };
  }
}

// =====================================================
// FETCH FULL DETAILS
// =====================================================

/**
 * Fetch complete tour package details for rate calculation
 *
 * @param package_id - Package UUID
 * @returns Full package details with seasons, pricing
 */
export async function fetchTourDetails(package_id: string): Promise<VwToursPackage | null> {
  console.log(`[TourSearch] Fetching full details for package: ${package_id}`);
  return fetchTourPackageDetailsForQuote(package_id);
}

// =====================================================
// TRANSFER BASIS DETECTION
// =====================================================

/**
 * Detect tour basis (SIC vs Private) from query
 */
export function detectTourBasis(query: string): "SIC" | "Private" | null {
  const queryLower = query.toLowerCase();

  if (queryLower.includes("pvt") || queryLower.includes("private")) {
    return "Private";
  }

  if (queryLower.includes("sic") || queryLower.includes("seat in coach") || queryLower.includes("shared")) {
    return "SIC";
  }

  return null;
}

// =====================================================
// HIGH-LEVEL CONVENIENCE FUNCTION
// =====================================================

/**
 * Complete tour search and selection flow
 *
 * @param dmc_id - DMC UUID
 * @param context - Selection context
 * @returns Complete tour selection with rate data
 */
export async function searchAndSelectTour(
  dmc_id: string,
  context: SelectionContext
): Promise<{ selection: TourSelection | null; tokens_used: number }> {
  let totalTokens = 0;

  // Search tours (with destination if provided)
  const tours = context.destination
    ? await searchToursWithDestination(dmc_id, context.query, context.destination)
    : await searchTours(dmc_id, context.query);

  if (tours.length === 0) {
    console.log(`[TourSearch] No tours found for: "${context.query}"`);
    return { selection: null, tokens_used: 0 };
  }

  // Select best tour
  const tourResult = await selectBestTour(tours, context);
  totalTokens += tourResult.tokens_used;

  if (!tourResult.selection) {
    return { selection: null, tokens_used: totalTokens };
  }

  // Fetch full details
  const rateData = await fetchTourDetails(tourResult.selection.package_id);

  // Determine transfer type
  const basis = context.tour_basis || detectTourBasis(context.query);
  const transferType: "SIC" | "Private" | "Per Vehicle" = basis === "Private" ? "Private" : "SIC";

  const selection: TourSelection = {
    tour_id: tourResult.selection.tour_id,
    tour_name: tourResult.selection.tour_name,
    package_id: tourResult.selection.package_id,
    package_name: tourResult.selection.package_name,
    transfer_type: transferType,
    includes_transfer: tourResult.selection.includes_transfer,
    duration: tourResult.selection.duration || undefined,
    rate_data: rateData || undefined,
  };

  return { selection, tokens_used: totalTokens };
}

/**
 * Search and select multiple tours
 *
 * Used when user requests multiple activities (e.g., "North Island Tour, South Island Tour")
 *
 * @param dmc_id - DMC UUID
 * @param tourNames - Array of tour names to search
 * @param context - Selection context
 * @returns Array of tour selections
 */
export async function searchAndSelectMultipleTours(
  dmc_id: string,
  tourNames: string[],
  context: SelectionContext
): Promise<{ selections: TourSelection[]; tokens_used: number }> {
  const selections: TourSelection[] = [];
  let totalTokens = 0;

  for (const tourName of tourNames) {
    const tourContext = { ...context, query: tourName };
    const result = await searchAndSelectTour(dmc_id, tourContext);

    totalTokens += result.tokens_used;

    if (result.selection) {
      selections.push(result.selection);
    } else {
      console.log(`[TourSearch] Could not find tour: "${tourName}"`);
    }
  }

  return { selections, tokens_used: totalTokens };
}

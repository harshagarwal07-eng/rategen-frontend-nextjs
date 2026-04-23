/**
 * Combo Search Utilities
 *
 * Shared combo search functions for the itinerary pipeline.
 * Extracted from combo-agent.ts for reuse across agents.
 *
 * Combos are bundled packages of tours and/or transfers that offer
 * special pricing when booked together.
 */

import {
  searchCombosHybrid,
  fetchComboFullDetails as fetchComboDetailsFromDB,
  type ComboSearchResult as DBComboSearchResult,
  type ComboFullDetails as DBComboFullDetails,
} from "@/lib/supabase/combo-search";
import { getInternalLLM } from "@/lib/utils/model-config";
import { aiLog } from "@/lib/utils/ai-logger";
import { z } from "zod";
import type {
  SearchOptions,
  ComboSearchResult,
  ComboFullDetails,
  ComboSelection,
  LLMSelectionResult,
  SelectionContext,
} from "./types";

// =====================================================
// SEARCH FUNCTIONS
// =====================================================

/**
 * Search for combo packages using hybrid (text + vector) search
 *
 * @param dmc_id - DMC UUID
 * @param query - User's search query
 * @param destination_code - Optional country code filter
 * @param options - Search options
 * @returns Array of combo matches with similarity scores
 */
export async function searchCombos(
  dmc_id: string,
  query: string,
  destination_code?: string,
  options: SearchOptions = {}
): Promise<ComboSearchResult[]> {
  const { limit = 10 } = options;

  console.log(`[ComboSearch] Searching combos for: "${query}"`);

  let results: DBComboSearchResult[] = [];

  try {
    results = await searchCombosHybrid(dmc_id, query, destination_code, limit);
  } catch (error) {
    // If search fails, log and return empty array
    // Service mapper will handle the "no combos" case gracefully
    console.error(`[ComboSearch] Hybrid search failed: ${(error as Error).message}`);
    return [];
  }

  // Map to our shared type
  return results.map((r: DBComboSearchResult) => ({
    combo_id: r.combo_id,
    title: r.title,
    description: r.description,
    remarks: r.remarks,
    country_code: r.country_code,
    item_count: r.item_count,
    package_names: r.package_names,
    similarity_score: r.similarity_score,
    combo_type: r.combo_type,
    min_packages: r.min_packages,
    max_packages: r.max_packages,
  }));
}

// =====================================================
// COMBO TYPE DETECTION
// =====================================================

/**
 * Detect what services a combo contains
 *
 * @param title - Combo title
 * @param packageNames - Comma-separated package names
 * @returns Object indicating what services are included
 */
export function detectComboServices(
  title: string,
  packageNames?: string | null
): { hasTours: boolean; hasTransfers: boolean } {
  const text = `${title} ${packageNames || ""}`.toLowerCase();

  // Transfer patterns
  const transferPatterns = [
    "transfer",
    "airport",
    "pickup",
    "drop",
    "transportation",
    "car on disposal",
  ];
  const hasTransfers = transferPatterns.some((p) => text.includes(p));

  // Tour patterns
  const tourPatterns = [
    "tour",
    "excursion",
    "safari",
    "cruise",
    "island",
    "park",
    "walk",
    "adventure",
    "sightseeing",
  ];
  const hasTours = tourPatterns.some((p) => text.includes(p));

  return { hasTours, hasTransfers };
}

/**
 * Check if combo matches user's requested services
 *
 * @param combo - Combo search result
 * @param servicesRequested - Array of requested services ["tours", "transfers"]
 * @returns Whether combo matches the request
 */
export function comboMatchesRequestedServices(
  combo: ComboSearchResult,
  servicesRequested: string[]
): { matches: boolean; reason?: string } {
  const comboServices = detectComboServices(combo.title, combo.package_names);

  const userWantsTours = servicesRequested.includes("tours");
  const userWantsTransfers = servicesRequested.includes("transfers");

  // Combo has tours but user didn't request tours
  if (comboServices.hasTours && !userWantsTours) {
    return {
      matches: false,
      reason: `Combo contains tours but user only requested: [${servicesRequested.join(", ")}]`,
    };
  }

  // Combo has transfers but user didn't request transfers
  if (comboServices.hasTransfers && !userWantsTransfers) {
    return {
      matches: false,
      reason: `Combo contains transfers but user only requested: [${servicesRequested.join(", ")}]`,
    };
  }

  return { matches: true };
}

// =====================================================
// LLM VALIDATION
// =====================================================

interface ComboValidationResult {
  combo_id: string;
  matches: boolean;
  reason?: string;
}

/**
 * Use LLM to validate and select the best combo from search results
 *
 * This function does TWO things in ONE LLM call:
 * 1. Validates which combos match user's tours
 * 2. When multiple variants exist (e.g., Single vs Double basis), selects optimal based on pax
 *
 * @param query - User's query
 * @param combos - Combos to validate
 * @param servicesRequested - Services user requested
 * @param extractedTourNames - Explicit tour names from query
 * @param travelers - Optional travelers info for optimal variant selection
 * @returns Validation results with token count
 */
export async function validateCombosWithLLM(
  query: string,
  combos: ComboSearchResult[],
  servicesRequested: string[],
  extractedTourNames?: string[],
  travelers?: ComboTravelersInfo
): Promise<{ results: ComboValidationResult[]; tokens_used: number }> {
  if (combos.length === 0) {
    return { results: [], tokens_used: 0 };
  }

  const llm = getInternalLLM(0);

  // If travelers provided, fetch details for ALL combos to get age_policy + rates
  const comboDetails: Map<string, ComboFullDetails> = new Map();
  if (travelers && combos.length > 1) {
    const detailsPromises = combos.slice(0, 10).map(async (c) => {
      const details = await fetchComboDetails(c.combo_id);
      return { combo_id: c.combo_id, details };
    });

    const detailsResults = await Promise.all(detailsPromises);
    for (const { combo_id, details } of detailsResults) {
      if (details) {
        comboDetails.set(combo_id, details);
      }
    }
  }

  // Build combo list with description, remarks, and full details for LLM
  const comboList = combos
    .map((c, i) => {
      const typeLabel =
        c.combo_type === "OR"
          ? `[OR: min ${c.min_packages}${c.max_packages ? `, max ${c.max_packages}` : ""}]`
          : "[AND: all required]";

      let detailsInfo = "";
      const details = comboDetails.get(c.combo_id);
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

        // Add rate info from seasons
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

      // Include description (auto-generated: package titles joined with "+") and remarks
      const descStr = c.description ? `\n   Description: ${c.description}` : "";
      const remarksStr = c.remarks ? `\n   Remarks: ${c.remarks}` : "";

      return `${i + 1}. ${typeLabel} "${c.title}"
   Contains: ${c.package_names || "N/A"}${descStr}${remarksStr}${detailsInfo}`;
    })
    .join("\n\n");

  const ValidationSchema = z.object({
    selected_number: z.number().describe("Single best combo number (1-indexed), or 0 if none match"),
    reasoning: z.string().describe("Brief explanation of selection including cost calculation if variants exist"),
  });

  // Build pax context if travelers provided
  let paxContext = "";
  if (travelers) {
    const childAgesStr = travelers.children_ages.length > 0
      ? `(ages: ${travelers.children_ages.join(", ")})`
      : "";
    paxContext = `
PAX DETAILS: ${travelers.adults} Adults + ${travelers.children} Children ${childAgesStr}

VARIANT HANDLING (only if multiple basis options exist for same combo):
- If you see variants like "Package X (Single basis)" and "Package X (Double basis)":
  1. If rates are provided: Apply Age Policy, calculate costs, keep ONLY the cheaper variant
  2. If NO rates provided: Keep the DOUBLE BASIS variant (better value for groups)
- If no variants exist, just return all matching combos
- IMPORTANT: Never exclude ALL variants - always return at least ONE matching combo
`;
  }

  const prompt = `Select the SINGLE BEST combo that matches the user's booked tours.

USER'S BOOKED TOURS:
${(extractedTourNames || []).join("\n")}

AVAILABLE COMBOS:
${comboList}
${paxContext}
SELECTION RULES:

1. A combo MATCHES if the user has booked ALL activities it contains
2. Use FLEXIBLE name matching - match by core activity name, ignoring:
   - Suffixes like "with Photo CD"
   - Basis variants like "(Single basis)" vs "(Double basis)"
   - Brackets and extra details

MATCHING EXAMPLES:
✓ "Undersea Walk with Photo CD" matches "Undersea Walk"
✓ "Parasailing (Single basis)" matches "Parasailing (Double basis)"
✓ "Quad Adventure (Double basis 450cc)" matches "Exclusive Adventure Tour"

3. If MULTIPLE combos match:
   - Prefer combo that covers MORE tours
   - If same coverage, prefer DOUBLE BASIS variant (better value)
   - If rates available, calculate total cost and pick CHEAPEST

4. If NO combos match ALL their required tours, return 0

Return the SINGLE best combo number (1-indexed), or 0 if none match.`;

  // Log the prompt for debugging
  aiLog("[ComboSearch]", "Sending validation prompt to LLM", {
    combos_count: combos.length,
    mapped_tour_names: extractedTourNames || [],
    combo_list_for_llm: comboList,
    has_travelers: !!travelers,
    travelers: travelers,
  });

  try {
    const structured = llm.withStructuredOutput(ValidationSchema, { includeRaw: true });
    const response = await structured.invoke(prompt);
    const result = response.parsed;

    const tokens =
      (response.raw as any).usage_metadata?.total_tokens ||
      (response.raw as any).response_metadata?.usage?.total_tokens ||
      0;

    const selectedNumber = result.selected_number || 0;

    aiLog("[ComboSearch]", "LLM validation result", {
      selected_number: selectedNumber,
      reasoning: result.reasoning,
    });

    // Single best combo - mark only that one as matching
    const results: ComboValidationResult[] = combos.map((combo, i) => ({
      combo_id: combo.combo_id,
      matches: selectedNumber === i + 1,
      reason: selectedNumber === i + 1 ? undefined : "Not the best match",
    }));

    return { results, tokens_used: tokens };
  } catch (error) {
    console.error("[ComboSearch] LLM validation error:", error);
    return {
      results: combos.map((c) => ({
        combo_id: c.combo_id,
        matches: false,
        reason: "Validation failed",
      })),
      tokens_used: 0,
    };
  }
}

// =====================================================
// FETCH FULL DETAILS
// =====================================================

/**
 * Fetch complete combo details for rate calculation
 *
 * @param combo_id - Combo UUID
 * @returns Full combo details with items and seasons
 */
export async function fetchComboDetails(combo_id: string): Promise<ComboFullDetails | null> {
  console.log(`[ComboSearch] Fetching full details for combo: ${combo_id}`);

  const details = await fetchComboDetailsFromDB(combo_id);
  if (!details) return null;

  return details as ComboFullDetails;
}

// =====================================================
// OPTIMAL VARIANT SELECTION (LLM-based)
// =====================================================

/**
 * Travelers info for optimal variant selection
 */
export interface ComboTravelersInfo {
  adults: number;
  children: number;
  children_ages: number[];
}

/**
 * Use LLM to select the optimal combo variant based on pax + age_policy + rates
 *
 * When multiple variants exist (e.g., Single basis vs Double basis),
 * this function fetches details for ALL variants and lets LLM calculate
 * which is most cost-effective for the party.
 *
 * @param combos - Valid combos (already passed LLM validation)
 * @param travelers - Travelers info for cost calculation
 * @returns Selected combos with duplicates removed (optimal variant only)
 */
export async function selectOptimalComboVariants(
  combos: ComboSearchResult[],
  travelers?: ComboTravelersInfo
): Promise<{ selections: ComboSearchResult[]; tokens_used: number }> {
  if (combos.length <= 1 || !travelers) {
    // No variants to compare, or no travelers info for cost calculation
    return { selections: combos, tokens_used: 0 };
  }

  // Fetch details for ALL combos (LLM will determine which are variants)
  const comboDetails: Map<string, ComboFullDetails> = new Map();
  const detailsPromises = combos.map(async (c) => {
    const details = await fetchComboDetails(c.combo_id);
    return { combo_id: c.combo_id, details };
  });

  const detailsResults = await Promise.all(detailsPromises);
  for (const { combo_id, details } of detailsResults) {
    if (details) {
      comboDetails.set(combo_id, details);
    }
  }

  // Build combo list with details for LLM
  const comboList = combos
    .map((c, i) => {
      let detailsInfo = "";
      const details = comboDetails.get(c.combo_id);
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

      return `${i + 1}. "${c.title}" (contains: ${c.package_names || "N/A"})${detailsInfo}`;
    })
    .join("\n");

  const llm = getInternalLLM(0);

  const SelectionSchema = z.object({
    selected_numbers: z.array(z.number()).describe("Numbers of combos to keep (1-indexed), excluding redundant variants"),
    reasoning: z.string().describe("Brief explanation of selection, including cost calculations for variants"),
  });

  const childAgesStr = travelers.children_ages.length > 0
    ? `(ages: ${travelers.children_ages.join(", ")})`
    : "";

  const prompt = `Select optimal combos, removing redundant variants.

PAX DETAILS: ${travelers.adults} Adults + ${travelers.children} Children ${childAgesStr}

AVAILABLE COMBOS:
${comboList}

TASK:
1. IDENTIFY VARIANTS: Find combos that are the same package with different basis (e.g., Single vs Double)
2. For each variant group:
   a. APPLY AGE POLICY: Classify each traveler using the combo's Age Policy
   b. COUNT ELIGIBLE: Sum up travelers who qualify
   c. CALCULATE UNITS:
      - "Single basis" or "Per Person": units = eligible count
      - "Double basis" or "Per Pair": units = ceil(eligible count / 2)
      - "Per Vehicle": units = 1
   d. CALCULATE TOTAL COST: units × rate
   e. SELECT OPTIMAL: Keep ONLY the variant with LOWEST TOTAL COST
3. For non-variant combos: Keep all of them
4. Return the combo numbers to KEEP (not duplicates)

Example: If combos 1 and 2 are "Package X (Single)" and "Package X (Double)":
- Calculate cost for both using the party's eligible count
- Keep only the cheaper one

Return selected combo numbers.`;

  try {
    const structured = llm.withStructuredOutput(SelectionSchema, { includeRaw: true });
    const response = await structured.invoke(prompt);
    const result = response.parsed;

    const tokens =
      (response.raw as any).usage_metadata?.total_tokens ||
      (response.raw as any).response_metadata?.usage?.total_tokens ||
      0;

    // Filter to selected combos
    const selectedNumbers = result.selected_numbers || [];
    const selections = combos.filter((_, i) => selectedNumbers.includes(i + 1));

    console.log(`[ComboSearch] LLM selected ${selections.length} combos from ${combos.length} (removed ${combos.length - selections.length} redundant variants)`);
    console.log(`[ComboSearch] Selection reasoning: ${result.reasoning}`);

    return { selections, tokens_used: tokens };
  } catch (error) {
    console.error("[ComboSearch] LLM variant selection error:", error);
    // Fallback: return all combos
    return { selections: combos, tokens_used: 0 };
  }
}

// =====================================================
// RATE AVAILABILITY CHECK
// =====================================================

/**
 * Check if combo has rates for the requested basis (SIC or Private)
 */
export function checkComboRateAvailability(
  details: ComboFullDetails
): { hasSIC: boolean; hasPVT: boolean } {
  if (!details.seasons || details.seasons.length === 0) {
    return { hasSIC: false, hasPVT: false };
  }

  let hasSIC = false;
  let hasPVT = false;

  for (const season of details.seasons) {
    // Check SIC rates
    if (
      (season.sic_rate_adult && season.sic_rate_adult > 0) ||
      (season.sic_rate_child && season.sic_rate_child > 0) ||
      (season.sic_rate_teenager && season.sic_rate_teenager > 0)
    ) {
      hasSIC = true;
    }

    // Check PVT rates
    if (season.pvt_rate && typeof season.pvt_rate === "object") {
      const pvtValues = Object.values(season.pvt_rate);
      if (pvtValues.some((v) => typeof v === "number" && v > 0)) {
        hasPVT = true;
      }
    }

    if (
      season.per_vehicle_rate &&
      Array.isArray(season.per_vehicle_rate) &&
      season.per_vehicle_rate.length > 0
    ) {
      for (const vehicleRate of season.per_vehicle_rate) {
        if (vehicleRate && typeof vehicleRate === "object") {
          const values = Object.values(vehicleRate);
          if (values.some((v) => typeof v === "number" && v > 0)) {
            hasPVT = true;
            break;
          }
        }
      }
    }
  }

  return { hasSIC, hasPVT };
}

// =====================================================
// HIGH-LEVEL CONVENIENCE FUNCTION
// =====================================================

/**
 * Complete combo search and selection flow
 *
 * LLM selects the SINGLE BEST combo based on tour matching + pax + rates.
 * Returns null if no combo matches.
 *
 * @param dmc_id - DMC UUID
 * @param query - User's query
 * @param destination_code - Destination country code
 * @param servicesRequested - Services user requested
 * @param extractedTourNames - Explicit tour names from query
 * @param transferBasis - Requested transfer basis
 * @param travelers - Travelers info for optimal variant selection
 * @returns Single best combo or null
 */
export async function searchAndSelectCombos(
  dmc_id: string,
  query: string,
  destination_code?: string,
  servicesRequested: string[] = ["tours", "transfers"],
  extractedTourNames?: string[],
  transferBasis?: "SIC" | "Private",
  travelers?: ComboTravelersInfo
): Promise<{ selection: ComboSelection | null; tokens_used: number }> {
  let totalTokens = 0;

  // Search combos - vector search handles relevance
  const combos = await searchCombos(dmc_id, query, destination_code);

  if (combos.length === 0) {
    console.log(`[ComboSearch] No combos found for: "${query}"`);
    return { selection: null, tokens_used: 0 };
  }

  // Pass ALL results to LLM - LLM returns SINGLE BEST combo
  const validationResult = await validateCombosWithLLM(
    query,
    combos,
    servicesRequested,
    extractedTourNames,
    travelers
  );
  totalTokens += validationResult.tokens_used;

  // Find the single matched combo
  const matchedResult = validationResult.results.find((r) => r.matches);
  if (!matchedResult) {
    console.log(`[ComboSearch] No combo passed LLM validation`);
    return { selection: null, tokens_used: totalTokens };
  }

  const selectedCombo = combos.find((c) => c.combo_id === matchedResult.combo_id);
  if (!selectedCombo) {
    return { selection: null, tokens_used: totalTokens };
  }

  // Fetch details for the selected combo
  const details = await fetchComboDetails(selectedCombo.combo_id);
  if (!details) {
    console.log(`[ComboSearch] Could not fetch details for combo: ${selectedCombo.title}`);
    return { selection: null, tokens_used: totalTokens };
  }

  // Check rate availability if basis specified
  if (transferBasis) {
    const availability = checkComboRateAvailability(details);
    const isSIC = transferBasis === "SIC";

    if (isSIC && !availability.hasSIC && !availability.hasPVT) {
      console.log(`[ComboSearch] Combo "${selectedCombo.title}" has no SIC or PVT rates`);
      return { selection: null, tokens_used: totalTokens };
    }

    if (!isSIC && !availability.hasPVT && !availability.hasSIC) {
      console.log(`[ComboSearch] Combo "${selectedCombo.title}" has no PVT or SIC rates`);
      return { selection: null, tokens_used: totalTokens };
    }
  }

  const selection: ComboSelection = {
    combo_id: selectedCombo.combo_id,
    title: selectedCombo.title,
    description: selectedCombo.description,
    package_names: selectedCombo.package_names,
    item_count: selectedCombo.item_count,
    rate_data: details,
    combo_type: selectedCombo.combo_type,
    min_packages: selectedCombo.min_packages,
    max_packages: selectedCombo.max_packages,
  };

  console.log(`[ComboSearch] Selected combo: ${selection.title}`);

  return { selection, tokens_used: totalTokens };
}

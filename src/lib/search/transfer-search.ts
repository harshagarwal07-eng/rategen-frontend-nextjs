/**
 * Transfer Search Utilities
 *
 * Shared transfer search functions for the itinerary pipeline.
 * Extracted from transfer-agent.ts for reuse across agents.
 */

import {
  searchTransferPackagesDirect,
  fetchTransferPackageDetailsForQuote,
  type DirectTransferPackageSearchResult,
} from "@/lib/supabase/vector-search";
import { getInternalLLM } from "@/lib/utils/model-config";
import { z } from "zod";
import type { VwTransfersPackage } from "@/types/database";
import type {
  SearchOptions,
  TransferSearchResult,
  TransferSelection,
  LLMSelectionResult,
  SelectionContext,
} from "./types";

// =====================================================
// SEARCH FUNCTIONS
// =====================================================

/**
 * Search for transfer packages by route/name using vector similarity
 *
 * @param dmc_id - DMC UUID
 * @param query - User's search query (e.g., "airport to hotel transfer")
 * @param options - Search options
 * @returns Array of transfer matches with similarity scores
 */
export async function searchTransfers(
  dmc_id: string,
  query: string,
  options: SearchOptions = {}
): Promise<TransferSearchResult[]> {
  // Higher limit to give LLM more options - LLM will pick the best one
  const { limit = 15 } = options;

  console.log(`[TransferSearch] Searching transfers for: "${query}"`);

  let results: DirectTransferPackageSearchResult[] = [];

  try {
    results = await searchTransferPackagesDirect(dmc_id, query, { limit });
  } catch (error) {
    // If embedding fails, log and return empty array
    // Service mapper will handle the "no results" case
    console.error(`[TransferSearch] Vector search failed: ${(error as Error).message}`);
    return [];
  }

  // Map to our shared type
  return results.map((r: DirectTransferPackageSearchResult) => ({
    package_id: r.package_id,
    package_name: r.package_name,
    transfer_id: r.transfer_id,
    transfer_name: r.transfer_name,
    description: r.description,
    package_remarks: r.package_remarks,
    route: r.route,
    origin: r.origin,
    destination: r.destination,
    mode: r.mode,
    preferred: r.preferred,
    iscombo: r.iscombo,
    duration: r.duration,
    city: r.city,
    country: r.country,
    currency: r.currency,
    similarity: r.similarity,
  }));
}

/**
 * Search for transfers with destination prepended for better results
 *
 * @param dmc_id - DMC UUID
 * @param query - User's search query
 * @param destination - Destination to prepend
 * @param options - Search options
 */
export async function searchTransfersWithDestination(
  dmc_id: string,
  query: string,
  destination: string,
  options: SearchOptions = {}
): Promise<TransferSearchResult[]> {
  // Prepend destination if not already in query
  const queryLower = query.toLowerCase();
  const destLower = destination.toLowerCase();

  const searchQuery = queryLower.includes(destLower) ? query : `${destination} ${query}`;

  return searchTransfers(dmc_id, searchQuery, options);
}

// =====================================================
// DIRECTION DETECTION
// =====================================================

export type TransferDirection = "arrival" | "departure" | "inter-tour" | "full-day" | "unknown";

/**
 * Detect transfer direction from query
 */
export function detectTransferDirection(query: string): TransferDirection {
  const queryLower = query.toLowerCase();

  // Arrival patterns
  if (
    queryLower.includes("airport to hotel") ||
    queryLower.includes("arrival transfer") ||
    (queryLower.includes("airport") && queryLower.includes("to") && queryLower.includes("hotel"))
  ) {
    return "arrival";
  }

  // Departure patterns
  if (
    queryLower.includes("hotel to airport") ||
    queryLower.includes("departure transfer") ||
    (queryLower.includes("hotel") && queryLower.includes("to") && queryLower.includes("airport"))
  ) {
    return "departure";
  }

  // Inter-tour patterns
  if (
    queryLower.includes("hotel to tour") ||
    queryLower.includes("tour to hotel") ||
    queryLower.includes("inter tour") ||
    queryLower.includes("inter-tour")
  ) {
    return "inter-tour";
  }

  // Full day patterns
  if (queryLower.includes("full day") || queryLower.includes("car on disposal") || queryLower.includes("full-day")) {
    return "full-day";
  }

  return "unknown";
}

/**
 * Detect transfer basis (SIC vs Private) from query
 */
export function detectTransferBasis(query: string): "SIC" | "Private" | null {
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
// LLM SELECTION
// =====================================================

/**
 * Use LLM to select the best transfer package from search results
 *
 * @param results - Transfer search results
 * @param context - Selection context
 * @param direction - Expected transfer direction
 * @returns Best transfer selection with reasoning
 */
export async function selectBestTransfer(
  results: TransferSearchResult[],
  context: SelectionContext,
  direction?: TransferDirection
): Promise<LLMSelectionResult<TransferSearchResult>> {
  if (results.length === 0) {
    return {
      selection: null,
      alternatives: [],
      reasoning: "No transfers found matching the query",
      tokens_used: 0,
    };
  }

  if (results.length === 1) {
    return {
      selection: results[0],
      alternatives: [],
      reasoning: "Single transfer match",
      tokens_used: 0,
    };
  }

  const llm = getInternalLLM(0); // temperature=0 for deterministic

  // Build direction hint for prompt
  let directionHint = "";
  if (direction === "arrival") {
    directionHint = "\n**⚠️ REQUIRED DIRECTION: ARRIVAL (Airport→Hotel)**";
  } else if (direction === "departure") {
    directionHint = "\n**⚠️ REQUIRED DIRECTION: DEPARTURE (Hotel→Airport)**";
  }

  const transferList = results
    .map((t, i) => {
      const route = t.route || `${t.origin || "?"} → ${t.destination || "?"}`;
      const remarks = t.package_remarks ? ` | Notes: ${t.package_remarks.substring(0, 80)}` : "";
      return `${i + 1}. ${t.package_name} [${t.transfer_name}] (route: ${route}, mode: ${t.mode || "N/A"}${
        t.preferred ? ", PREFERRED" : ""
      })${remarks}`;
    })
    .join("\n");

  const SelectionSchema = z.object({
    selected_number: z.number().describe("Number of the selected transfer (1-indexed)"),
    reasoning: z.string().describe("Brief explanation of selection"),
  });

  const prompt = `Select the best transfer package for this request.

USER REQUEST: "${context.query}"
PARTY: ${context.party_size || "Not specified"}
DATE: ${context.check_in_date || "Not specified"}
TRANSFER BASIS: ${context.transfer_basis || "Not specified"}
${directionHint}

AVAILABLE TRANSFERS:
${transferList}

SELECTION RULES:
1. Match direction EXACTLY - NEVER select arrival for departure or vice versa!
2. Match route to user's request (origin → destination)
3. Prefer PREFERRED transfers if match is similar
4. Consider mode (car, van, etc.) if user specified

Select ONE transfer.`;

  try {
    const structured = llm.withStructuredOutput(SelectionSchema, { includeRaw: true });
    const response = await structured.invoke(prompt);
    const result = response.parsed;

    // Handle null response from LLM
    if (!result) {
      console.error("[TransferSearch] LLM returned null response");
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
    console.error("[TransferSearch] LLM selection error:", error);
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
 * Fetch complete transfer package details for rate calculation
 *
 * @param package_id - Package UUID
 * @returns Full package details with seasons, pricing
 */
export async function fetchTransferDetails(package_id: string): Promise<VwTransfersPackage | null> {
  console.log(`[TransferSearch] Fetching full details for package: ${package_id}`);
  return fetchTransferPackageDetailsForQuote(package_id);
}

// =====================================================
// HIGH-LEVEL CONVENIENCE FUNCTION
// =====================================================

/**
 * Complete transfer search and selection flow
 *
 * @param dmc_id - DMC UUID
 * @param context - Selection context
 * @returns Complete transfer selection with rate data
 */
export async function searchAndSelectTransfer(
  dmc_id: string,
  context: SelectionContext
): Promise<{ selection: TransferSelection | null; tokens_used: number }> {
  let totalTokens = 0;

  // Detect direction
  const direction = detectTransferDirection(context.query);

  // Search transfers (with destination if provided)
  const transfers = context.destination
    ? await searchTransfersWithDestination(dmc_id, context.query, context.destination)
    : await searchTransfers(dmc_id, context.query);

  if (transfers.length === 0) {
    console.log(`[TransferSearch] No transfers found for: "${context.query}"`);
    return { selection: null, tokens_used: 0 };
  }

  // Select best transfer
  const transferResult = await selectBestTransfer(transfers, context, direction);
  totalTokens += transferResult.tokens_used;

  if (!transferResult.selection) {
    return { selection: null, tokens_used: totalTokens };
  }

  // Fetch full details
  const rateData = await fetchTransferDetails(transferResult.selection.package_id);

  const selection: TransferSelection = {
    transfer_id: transferResult.selection.transfer_id,
    transfer_name: transferResult.selection.transfer_name,
    package_id: transferResult.selection.package_id,
    package_name: transferResult.selection.package_name,
    route: transferResult.selection.route,
    vehicle_type: transferResult.selection.mode || "Car",
    rate_data: rateData || undefined,
  };

  return { selection, tokens_used: totalTokens };
}

/**
 * Search and select arrival + departure transfers as a pair
 *
 * Common pattern for roundtrip airport transfers
 *
 * @param dmc_id - DMC UUID
 * @param context - Selection context
 * @returns Pair of transfer selections (arrival, departure)
 */
export async function searchAndSelectRoundtripTransfers(
  dmc_id: string,
  context: SelectionContext
): Promise<{
  arrival: TransferSelection | null;
  departure: TransferSelection | null;
  tokens_used: number;
}> {
  const destination = context.destination || "";

  // Search for arrival transfer
  const arrivalContext = {
    ...context,
    query: `${destination} airport to hotel transfer arrival`,
  };
  const arrivalResult = await searchAndSelectTransfer(dmc_id, arrivalContext);

  // Search for departure transfer
  const departureContext = {
    ...context,
    query: `${destination} hotel to airport transfer departure`,
  };
  const departureResult = await searchAndSelectTransfer(dmc_id, departureContext);

  return {
    arrival: arrivalResult.selection,
    departure: departureResult.selection,
    tokens_used: arrivalResult.tokens_used + departureResult.tokens_used,
  };
}

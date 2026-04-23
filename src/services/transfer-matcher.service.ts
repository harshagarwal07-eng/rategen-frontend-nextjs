/**
 * Transfer Matcher Service (Stage 1 of 3-stage transfer search)
 *
 * Uses small model to intelligently match user query to transfer(s) from minimal transfer name data.
 *
 * Token usage: ~600 tokens vs ~40,000 for full data processing
 */

import { getInternalLLM } from "@/lib/utils/model-config";
import type { TransferNameSearchResult } from "@/lib/supabase/vector-search";

export interface TransferMatchRequest {
  query: string;
  transfers: TransferNameSearchResult[];
  conversationHistory?: Array<{ role: string; content: string }>;
  requiredRoutes?: string[]; // e.g., ["Airport to Hotel", "Hotel to Airport"]
}

export interface TransferMatchResult {
  transfer_ids: string[];
  confidence: "specific" | "vague" | "none";
  reasoning: string;
  usage?: { total_tokens: number };
}

export class TransferMatcherService {
  /**
   * Match user query to transfer(s) using AI
   */
  async matchTransfers(
    request: TransferMatchRequest
  ): Promise<TransferMatchResult> {
    console.log(
      `[TransferMatcher] Matching query to ${request.transfers.length} transfers`
    );

    // Handle no transfers case
    if (request.transfers.length === 0) {
      return {
        transfer_ids: [],
        confidence: "none",
        reasoning: "No transfers found matching the search query",
      };
    }

    // Shortcut: If only 1 transfer, use it directly
    if (request.transfers.length === 1) {
      console.log(
        `[TransferMatcher] Only 1 transfer available (${request.transfers[0].transfer_name}), using it directly`
      );
      return {
        transfer_ids: [request.transfers[0].transfer_id],
        confidence: "specific",
        reasoning: `Single transfer match: ${request.transfers[0].transfer_name}`,
      };
    }

    // Use small/internal model for matching
    const llm = getInternalLLM(0);

    // Build conversation context
    const conversationContext =
      request.conversationHistory
        ?.map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n") || "No previous conversation";

    // Build transfer list for LLM
    const transfersList = request.transfers
      .map(
        (t, i) =>
          `${i + 1}. ${t.transfer_name} (Route: ${t.route || "N/A"}, Mode: ${t.mode || "N/A"}, ${t.city}, ${t.country}${t.preferred ? " ⭐ PREFERRED" : ""}) - ID: ${t.transfer_id}`
      )
      .join("\n");

    const prompt = this.buildTransferMatcherPrompt(
      conversationContext,
      request.query,
      transfersList,
      request.requiredRoutes
    );

    try {
      const response = await llm.invoke(prompt);
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(
          "[TransferMatcher] LLM response is not valid JSON:",
          content
        );
        throw new Error("LLM response is not valid JSON");
      }

      const result = JSON.parse(jsonMatch[0]);

      // Extract token usage
      const usage =
        (response as any).usage_metadata ||
        (response as any).response_metadata?.usage;
      if (usage) {
        result.usage = {
          total_tokens: usage.total_tokens || usage.totalTokenCount || 0,
        };
      }

      // Apply post-processing filters
      const filteredResult = this.applyPostProcessingFilters(
        result,
        request.transfers
      );

      console.log(
        `[TransferMatcher] Matched ${filteredResult.transfer_ids.length} transfers with confidence: ${filteredResult.confidence}`
      );

      return filteredResult;
    } catch (error) {
      console.error("[TransferMatcher] Error matching transfers:", error);

      // Fallback: return top 3 preferred transfers
      const topTransfers = request.transfers
        .filter((t) => t.preferred)
        .slice(0, 3)
        .map((t) => t.transfer_id);

      return {
        transfer_ids:
          topTransfers.length > 0
            ? topTransfers
            : request.transfers.slice(0, 3).map((t) => t.transfer_id),
        confidence: "vague",
        reasoning: "Error in matching, returning top transfers",
      };
    }
  }

  /**
   * Build the prompt for transfer matching
   */
  private buildTransferMatcherPrompt(
    conversationContext: string,
    userQuery: string,
    transfersList: string,
    requiredRoutes?: string[]
  ): string {
    const routeRequirements = requiredRoutes?.length
      ? `\n## Required Routes\n${requiredRoutes.map((r) => `- ${r}`).join("\n")}`
      : "";

    return `You are a transfer matching assistant. Your job is to select which transfer(s) from the database best match the user's request.

## Previous Conversation
${conversationContext}

## Current User Request
"${userQuery}"
${routeRequirements}

## Available Transfers
${transfersList}

## Selection Rules

1. **Route Matching**: Match transfers by route (e.g., "Airport to Hotel", "Hotel to Airport")
2. **Mode Selection**: Consider transfer mode (sedan, van, bus) based on party size
3. **PREFERRED Priority**: Prioritize transfers marked as PREFERRED

## Required Transfers for Typical Trip
- Arrival: Airport to Hotel
- Departure: Hotel to Airport
- Inter-city: If visiting multiple cities

## Response Format (JSON only)

{
  "transfer_ids": ["uuid1", "uuid2"],
  "confidence": "specific" | "vague" | "none",
  "reasoning": "Brief explanation of selection"
}

IMPORTANT:
- Return ONLY valid JSON, no other text
- Use exact transfer_ids from the list above
- Select transfers for both arrival and departure if applicable
- Match routes exactly to user needs`;
  }

  /**
   * Apply post-processing filters for PREFERRED prioritization
   */
  private applyPostProcessingFilters(
    result: TransferMatchResult,
    transfers: TransferNameSearchResult[]
  ): TransferMatchResult {
    if (result.transfer_ids.length <= 1 || result.confidence === "specific") {
      return result;
    }

    const matchedTransfers = transfers.filter((t) =>
      result.transfer_ids.includes(t.transfer_id)
    );

    // Prioritize PREFERRED transfers
    const preferredTransfers = matchedTransfers.filter(
      (t) => t.preferred
    );
    if (
      preferredTransfers.length > 0 &&
      preferredTransfers.length < matchedTransfers.length
    ) {
      console.log(
        `[TransferMatcher] PREFERRED filter: ${matchedTransfers.length} → ${preferredTransfers.length} transfers`
      );
      return {
        ...result,
        transfer_ids: preferredTransfers.map((t) => t.transfer_id),
        reasoning: `${result.reasoning} (prioritized PREFERRED transfers)`,
      };
    }

    return result;
  }
}

// Export singleton instance
export const transferMatcherService = new TransferMatcherService();

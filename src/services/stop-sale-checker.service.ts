/**
 * Stop Sale Checker Service
 *
 * Uses small model (gemini-2.5-flash-lite or gpt-5-nano) to intelligently
 * check if requested dates fall within stop sale periods.
 *
 * Token usage: ~400-600 tokens per check
 *
 * Stop sale means room is NOT AVAILABLE during those dates.
 * If even ONE night overlaps with stop sale → booking is blocked.
 */

import { getInternalLLM } from "@/lib/utils/model-config";
import { buildStopSaleCheckerPrompt } from "@/lib/prompts/stop-sale-checker.prompt";

export interface StopSaleCheckRequest {
  checkInDate: string; // ISO date string or formatted date (e.g., "2026-01-03" or "Jan 3, 2026")
  checkOutDate: string;
  nights: number;
  stopSalePeriods: string[]; // Array of stop sale period strings (e.g., "Jan 2, 2026 - Jan 5, 2026")
  userSelectedModel?: string;
}

export interface StopSaleCheckResult {
  is_available: boolean;
  status: "available" | "blocked";
  reason: string;
  usage?: { total_tokens: number };
}

export class StopSaleCheckerService {
  /**
   * Check if requested dates fall within stop sale periods using AI
   *
   * @param request - Check request with dates and stop sale periods
   * @returns Result indicating if room is available or blocked
   */
  async checkStopSale(
    request: StopSaleCheckRequest
  ): Promise<StopSaleCheckResult> {
    console.log(
      `[StopSaleChecker] Checking ${request.checkInDate} to ${request.checkOutDate} against ${request.stopSalePeriods.length} stop sale periods`
    );

    // If no stop sale periods, room is available
    if (request.stopSalePeriods.length === 0) {
      console.log("[StopSaleChecker] No stop sale periods defined, room is available");
      return {
        is_available: true,
        status: "available",
        reason: "No stop sale periods defined for this room",
      };
    }

    // Use small/internal model for checking (token-efficient)
    const llm = getInternalLLM(0);

    // Build stop sale periods string
    const stopSalePeriodsStr =
      request.stopSalePeriods.length > 0
        ? request.stopSalePeriods.map((period, i) => `${i + 1}. ${period}`).join("\n")
        : "No stop sale periods defined";

    // Build prompt
    const prompt = buildStopSaleCheckerPrompt(
      request.checkInDate,
      request.checkOutDate,
      request.nights,
      stopSalePeriodsStr
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
          "[StopSaleChecker] LLM response is not valid JSON:",
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

      console.log(
        `[StopSaleChecker] Result: ${result.status} - ${result.reason}`
      );
      console.log(
        `[StopSaleChecker] Token usage: ${result.usage?.total_tokens || 0}`
      );

      return result;
    } catch (error) {
      console.error("[StopSaleChecker] Error checking stop sale:", error);

      // Fallback: assume available (safer than blocking incorrectly)
      return {
        is_available: true,
        status: "available",
        reason: "Error checking stop sale periods, assuming available",
      };
    }
  }
}

// Export singleton instance
export const stopSaleCheckerService = new StopSaleCheckerService();

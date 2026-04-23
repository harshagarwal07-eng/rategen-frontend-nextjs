/**
 * Package Selector Service (Stage 2 of 3-stage tour search)
 *
 * Uses small model to intelligently select the best package(s) based on user query.
 *
 * Token usage: ~900 tokens vs being part of 50,000 token formatResponse
 */

import { getInternalLLM } from "@/lib/utils/model-config";
import type {
  TourPackageSearchResult,
  TransferPackageSearchResult,
} from "@/lib/supabase/vector-search";
import {
  buildTourPackageSelectorPrompt,
  buildTransferPackageSelectorPrompt,
} from "@/lib/prompts/package-selector.prompt";

// =====================================================
// TOUR PACKAGE SELECTOR
// =====================================================

export interface TourPackageSelectRequest {
  query: string;
  packages: TourPackageSearchResult[];
  partySize?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  userSelectedModel?: string;
  countryCode?: string; // ISO 2-letter country code for country-specific rules
  checkInDate?: string; // For operational days validation
}

export interface TourPackageSelectResult {
  selections: Array<{
    tour_id: string;
    tour_name: string;
    package_id: string;
    package_name: string;
    transfer_type: "SIC" | "Private" | "Per Vehicle";
    reasoning: string;
    sic_not_available_reason?: string; // If user wanted SIC but it doesn't operate on this day
  }>;
  alternatives?: Array<{
    tour_id: string;
    tour_name: string;
    package_id: string;
    package_name: string;
    transfer_type: "SIC" | "Private" | "Per Vehicle";
    not_available_reason: string; // Why this package doesn't work
  }>;
  reasoning: string;
  usage?: { total_tokens: number };
}

// =====================================================
// TRANSFER PACKAGE SELECTOR
// =====================================================

export interface TransferPackageSelectRequest {
  query: string;
  packages: TransferPackageSearchResult[];
  partySize?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  userSelectedModel?: string;
}

export interface TransferPackageSelectResult {
  selections: Array<{
    transfer_id: string;
    transfer_name: string;
    package_id: string;
    package_name: string;
    route: string | null;
    vehicle_type: string;
    reasoning: string;
  }>;
  reasoning: string;
  usage?: { total_tokens: number };
}

export class PackageSelectorService {
  /**
   * Select best tour package(s) for each tour using AI
   */
  async selectTourPackage(
    request: TourPackageSelectRequest
  ): Promise<TourPackageSelectResult> {
    console.log(
      `[PackageSelector] Selecting from ${request.packages.length} tour packages across ${
        new Set(request.packages.map((p) => p.tour_id)).size
      } tours`
    );

    // Handle no packages case
    if (request.packages.length === 0) {
      return {
        selections: [],
        reasoning: "No packages available",
      };
    }

    const llm = getInternalLLM(0);

    const conversationContext =
      request.conversationHistory
        ?.map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n") || "No previous conversation";

    // Group packages by tour
    const packagesByTour = new Map<string, TourPackageSearchResult[]>();
    request.packages.forEach((pkg) => {
      if (!packagesByTour.has(pkg.tour_id)) {
        packagesByTour.set(pkg.tour_id, []);
      }
      packagesByTour.get(pkg.tour_id)!.push(pkg);
    });

    // Build packages list for LLM with remarks and descriptions
    const packagesList = Array.from(packagesByTour.entries())
      .map(([tour_id, packages]) => {
        const tourName = packages[0].tour_name;
        const packagesText = packages
          .map((p, i) => {
            let packageInfo = `   ${i + 1}. ${p.package_name}${p.iscombo ? " [COMBO]" : ""}${p.package_preferred ? " ⭐ PREFERRED" : ""} - ID: ${p.package_id}`;

            // Add AI remarks if available (CRITICAL for Mauritius operational days)
            if (p.package_description) {
              packageInfo += `\n      Description: ${p.package_description}`;
            }

            // Add remarks - this is where SIC operational days info is stored
            if (p.package_remarks) {
              packageInfo += `\n      ⚠️ Remarks: ${p.package_remarks}`;
            }

            return packageInfo;
          })
          .join("\n");
        return `**${tourName}** (Tour ID: ${tour_id}):\n${packagesText}`;
      })
      .join("\n\n");

    const prompt = buildTourPackageSelectorPrompt(
      conversationContext,
      request.query,
      request.partySize || "Not specified",
      packagesList,
      request.countryCode,
      request.checkInDate
    );

    try {
      const response = await llm.invoke(prompt);
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(
          "[PackageSelector] LLM response is not valid JSON:",
          content
        );
        throw new Error("LLM response is not valid JSON");
      }

      const result = JSON.parse(jsonMatch[0]);

      const usage =
        (response as any).usage_metadata ||
        (response as any).response_metadata?.usage;
      if (usage) {
        result.usage = {
          total_tokens: usage.total_tokens || usage.totalTokenCount || 0,
        };
      }

      console.log(
        `[PackageSelector] Selected ${result.selections.length} tour packages`
      );
      console.log(
        `[PackageSelector] Token usage: ${result.usage?.total_tokens || 0}`
      );

      return result;
    } catch (error) {
      console.error("[PackageSelector] Error selecting tour packages:", error);

      // Fallback: return first package for each tour
      const selections = Array.from(packagesByTour.entries()).map(
        ([tour_id, packages]) => ({
          tour_id,
          tour_name: packages[0].tour_name,
          package_id: packages[0].package_id,
          package_name: packages[0].package_name,
          transfer_type: "SIC" as const,
          reasoning: "Default selection due to error",
        })
      );

      return {
        selections,
        reasoning: "Error in selection, using first package for each tour",
      };
    }
  }

  /**
   * Select best transfer package(s) for each transfer using AI
   */
  async selectTransferPackage(
    request: TransferPackageSelectRequest
  ): Promise<TransferPackageSelectResult> {
    console.log(
      `[PackageSelector] Selecting from ${request.packages.length} transfer packages across ${
        new Set(request.packages.map((p) => p.transfer_id)).size
      } transfers`
    );

    // Handle no packages case
    if (request.packages.length === 0) {
      return {
        selections: [],
        reasoning: "No packages available",
      };
    }

    const llm = getInternalLLM(0);

    const conversationContext =
      request.conversationHistory
        ?.map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n") || "No previous conversation";

    // Group packages by transfer
    const packagesByTransfer = new Map<string, TransferPackageSearchResult[]>();
    request.packages.forEach((pkg) => {
      if (!packagesByTransfer.has(pkg.transfer_id)) {
        packagesByTransfer.set(pkg.transfer_id, []);
      }
      packagesByTransfer.get(pkg.transfer_id)!.push(pkg);
    });

    // Build packages list for LLM
    const packagesList = Array.from(packagesByTransfer.entries())
      .map(([transfer_id, packages]) => {
        const transferName = packages[0].transfer_name;
        const route = packages[0].route || "N/A";
        const mode = packages[0].mode || "N/A";
        const packagesText = packages
          .map(
            (p, i) =>
              `   ${i + 1}. ${p.package_name}${p.iscombo ? " [COMBO]" : ""}${p.package_preferred ? " ⭐ PREFERRED" : ""} - ID: ${p.package_id}`
          )
          .join("\n");
        return `**${transferName}** (Route: ${route}, Mode: ${mode}, Transfer ID: ${transfer_id}):\n${packagesText}`;
      })
      .join("\n\n");

    const prompt = buildTransferPackageSelectorPrompt(
      conversationContext,
      request.query,
      request.partySize || "Not specified",
      packagesList
    );

    try {
      const response = await llm.invoke(prompt);
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("LLM response is not valid JSON");
      }

      const result = JSON.parse(jsonMatch[0]);

      const usage =
        (response as any).usage_metadata ||
        (response as any).response_metadata?.usage;
      if (usage) {
        result.usage = {
          total_tokens: usage.total_tokens || usage.totalTokenCount || 0,
        };
      }

      console.log(
        `[PackageSelector] Selected ${result.selections.length} transfer packages`
      );

      return result;
    } catch (error) {
      console.error(
        "[PackageSelector] Error selecting transfer packages:",
        error
      );

      // Fallback: return first package for each transfer
      const selections = Array.from(packagesByTransfer.entries()).map(
        ([transfer_id, packages]) => ({
          transfer_id,
          transfer_name: packages[0].transfer_name,
          package_id: packages[0].package_id,
          package_name: packages[0].package_name,
          route: packages[0].route,
          vehicle_type: packages[0].mode || "Sedan",
          reasoning: "Default selection due to error",
        })
      );

      return {
        selections,
        reasoning: "Error in selection, using first package for each transfer",
      };
    }
  }
}

// Export singleton instance
export const packageSelectorService = new PackageSelectorService();

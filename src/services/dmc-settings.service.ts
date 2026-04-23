/**
 * DMC Settings Validation Service
 *
 * This service handles validation of DMC settings and policies
 * for determining if individual service rates are allowed.
 */

import { createClient } from "@/utils/supabase/server";
import type { DMCSettings, TravelQueryInfo, PolicyValidation } from "@/types/query-classification";

export class DMCSettingsService {
  /**
   * Get DMC settings for a given DMC ID
   */
  public async getDMCSettings(dmcId: string, country?: string): Promise<DMCSettings | null> {
    try {
      console.log("[DMCSettings] Fetching settings for DMC:", dmcId, "country:", country);

      // Create admin client for DMC settings access
      const supabase = await createClient();

      // First fetch DMC basic settings (including all fields for template population)
      const { data: dmcData, error: dmcError } = await supabase
        .from("dmcs")
        .select(
          "id, name, streetAddress, city, country, website, pricing_breakup_rule, output_currency, countryServing, kill_switch, allow_individual_service_rates"
        )
        .eq("id", dmcId)
        .single();

      if (dmcError) {
        console.error("[DMCSettings] Error fetching DMC settings:", dmcError);
        return null;
      }

      if (!dmcData) {
        console.warn("[DMCSettings] No DMC found with ID:", dmcId);
        return null;
      }

      // Now fetch policies from vw_docs (CORRECT QUERY!)
      // Each policy is a separate row with service_type
      let policiesQuery = supabase
        .from("vw_docs")
        .select("service_type, content")
        .eq("dmc_id", dmcId)
        .eq("type", "knowledgebase")
        .in("service_type", ["sell_policy", "hotels", "transfers", "tours", "travel_theme"])
        .eq("is_active", true);

      // Add country filter if provided (policies are country-specific!)
      // ✅ Use country_code column (ISO code like "SG"), NOT country (which is UUID)
      if (country) {
        policiesQuery = policiesQuery.eq("country_code", country);
      }

      const { data: docData, error: docError } = await policiesQuery;

      if (docError) {
        console.warn("[DMCSettings] Could not fetch policies from vw_docs:", docError);
        // Continue without policies - they can be null
      }

      // Transform array of policy rows into object
      const policies = {
        sell_policy: docData?.find((d) => d.service_type === "sell_policy")?.content || null,
        hotel_policy: docData?.find((d) => d.service_type === "hotels")?.content || null,
        tour_policy: docData?.find((d) => d.service_type === "tours")?.content || null,
        transfer_policy: docData?.find((d) => d.service_type === "transfers")?.content || null,
        travel_theme: docData?.find((d) => d.service_type === "travel_theme")?.content || null, // ✅ Separate travel theme
      };

      console.log(`[DMCSettings] Found ${docData?.length || 0} policy documents`);

      const settings: DMCSettings = {
        id: dmcData.id,
        // DMC Profile Info (for templates)
        name: dmcData.name,
        streetAddress: dmcData.streetAddress,
        city: dmcData.city,
        country: dmcData.country,
        website: dmcData.website,
        // Settings
        pricing_breakup_rule: dmcData.pricing_breakup_rule,
        output_currency: dmcData.output_currency,
        allow_individual_service_rates: dmcData.allow_individual_service_rates || false,
        countryServing: dmcData.countryServing || [], // ✅ Countries this DMC serves
        kill_switch: dmcData.kill_switch || false,
        // Policies
        default_sell_policy: policies.sell_policy,
        default_hotel_policy: policies.hotel_policy,
        default_tour_policy: policies.tour_policy,
        default_transfer_policy: policies.transfer_policy,
        default_travel_theme: policies.travel_theme, // ✅ Travel theme policy
      };

      console.log("[DMCSettings] Retrieved DMC settings:", {
        id: settings.id,
        currency: settings.output_currency,
        countryServing: settings.countryServing,
        allow_individual_rates: settings.allow_individual_service_rates,
        has_sell_policy: !!settings.default_sell_policy,
        has_hotel_policy: !!settings.default_hotel_policy,
        has_tour_policy: !!settings.default_tour_policy,
        has_transfer_policy: !!settings.default_transfer_policy,
        has_travel_theme: !!settings.default_travel_theme,
      });

      return settings;
    } catch (error) {
      console.error("[DMCSettings] Unexpected error:", error);
      return null;
    }
  }

  /**
   * Validate if the query is allowed based on DMC settings
   */
  public async validateQueryAgainstSettings(
    dmcId: string,
    queryInfo: TravelQueryInfo,
    originalQuery?: string,
    userSelectedModel?: string
  ): Promise<PolicyValidation> {
    console.log("[DMCSettings] Validating query against DMC settings:", {
      dmcId,
      category: queryInfo.category,
      services: queryInfo.services,
      destination: queryInfo.destination,
      destinationCode: queryInfo.destinationCode,
    });

    // ✅ Pass ISO country code (not full name!) to get country-specific policies
    const settings = await this.getDMCSettings(dmcId, queryInfo.destinationCode);

    if (!settings) {
      return {
        allowed: false,
        policy: "default",
        restrictions: ["DMC not found"],
        message: "Unable to validate DMC settings",
      };
    }

    // Check if individual service rates are allowed
    if (!settings.allow_individual_service_rates) {
      // Only allow complete quotes when individual service rates are disabled
      if (queryInfo.category !== "complete_quote") {
        return {
          allowed: false,
          policy: settings.default_sell_policy || "default",
          restrictions: ["Individual service rates are disabled"],
          message: "This DMC only allows complete trip quotes. Please provide full trip details.",
        };
      }
    }

    // Track total token usage across all policy validations
    let totalTokens = 0;

    // ✅ STAGE 1: Validate against DEFAULT SELL POLICY (DMC-wide gate)
    // As per PLAN.md Step 6: Check default_sell_policy FIRST before service-specific policies
    if (settings.default_sell_policy) {
      console.log("[DMCSettings] Stage 1: Validating against default sell policy");

      const sellPolicyValidation = await this.validatePolicyWithLLM(
        settings.default_sell_policy,
        "sell_policy",
        queryInfo,
        originalQuery,
        userSelectedModel
      );

      // Accumulate tokens
      totalTokens += sellPolicyValidation.usage?.total_tokens || 0;

      if (!sellPolicyValidation.allowed) {
        console.log("[DMCSettings] Stage 1: BLOCKED by default sell policy");
        return {
          allowed: false,
          policy: settings.default_sell_policy,
          restrictions: sellPolicyValidation.missingRequirements,
          reasoning: sellPolicyValidation.reasoning, // ✅ LLM reasoning
          suggestions: sellPolicyValidation.suggestions, // ✅ LLM suggestions
          message: sellPolicyValidation.reasoning, // ✅ Just LLM reasoning
          usage: totalTokens > 0 ? { total_tokens: totalTokens } : undefined,
        };
      }

      console.log("[DMCSettings] Stage 1: PASSED default sell policy");
    }

    // ✅ STAGE 2: Validate against SERVICE-SPECIFIC policies
    // Only reached if Stage 1 passed (or no sell policy exists)
    console.log("[DMCSettings] Stage 2: Validating service-specific policies");

    for (const service of queryInfo.services) {
      const policyValidation = await this.validateServicePolicy(
        settings,
        service,
        queryInfo,
        originalQuery,
        userSelectedModel
      );

      // Accumulate tokens
      totalTokens += policyValidation.usage?.total_tokens || 0;

      if (!policyValidation.allowed) {
        console.log(`[DMCSettings] Stage 2: BLOCKED by ${service} policy`);
        return {
          ...policyValidation,
          usage: totalTokens > 0 ? { total_tokens: totalTokens } : undefined,
        };
      }
    }

    console.log("[DMCSettings] All policy validations PASSED");
    return {
      allowed: true,
      policy: settings.default_sell_policy || "default",
      message: "Query validated successfully",
      usage: totalTokens > 0 ? { total_tokens: totalTokens } : undefined,
    };
  }

  /**
   * Validate individual service policy using LLM-based evaluation (STAGE 2)
   *
   * CRITICAL: NO HARDCODED RULES! Always use LLM to interpret policy text.
   * NOTE: This is Stage 2 - default_sell_policy was already checked in Stage 1
   */
  private async validateServicePolicy(
    settings: DMCSettings,
    service: string,
    queryInfo?: TravelQueryInfo,
    originalQuery?: string,
    userSelectedModel?: string
  ): Promise<PolicyValidation> {
    // Get service-specific policy ONLY (no fallback to sell policy - that was Stage 1)
    let policy: string | null | undefined;

    switch (service) {
      case "hotel":
        policy = settings.default_hotel_policy;
        break;
      case "tour":
      case "attraction":
        policy = settings.default_tour_policy;
        break;
      case "transfer":
        policy = settings.default_transfer_policy;
        break;
    }

    // ✅ If no service-specific policy, allow (sell policy already checked in Stage 1)
    if (!policy || !queryInfo) {
      return {
        allowed: true,
        policy: "default",
        message: `${service} service is allowed (no service-specific policy)`,
      };
    }

    // ✅ Validate service-specific policy with LLM
    const evaluation = await this.validatePolicyWithLLM(policy, service, queryInfo, originalQuery, userSelectedModel);

    // ✅ Return structured data - NO hardcoded formatting!
    // Response formatter LLM will create natural messages
    return {
      allowed: evaluation.allowed,
      policy: policy,
      restrictions: evaluation.missingRequirements,
      reasoning: evaluation.reasoning, // ✅ LLM reasoning
      suggestions: evaluation.suggestions, // ✅ LLM suggestions
      message: evaluation.allowed ? `${service} service is allowed` : evaluation.reasoning, // ✅ Just LLM reasoning, not hardcoded template
      usage: evaluation.usage, // ✅ Pass through token usage
    };
  }

  /**
   * Core LLM-based policy validation logic (used by both Stage 1 and Stage 2)
   *
   * CRITICAL: NO HARDCODED RULES! Always use LLM to interpret policy text.
   */
  private async validatePolicyWithLLM(
    policyText: string,
    serviceType: string,
    queryInfo: TravelQueryInfo,
    originalQuery?: string,
    userSelectedModel?: string
  ): Promise<{
    allowed: boolean;
    reasoning: string;
    missingRequirements?: string[];
    suggestions?: string[];
    usage?: { total_tokens: number };
  }> {
    const { policyEvaluatorService } = await import("./core/policy-evaluator.service");

    return await policyEvaluatorService.evaluatePolicy({
      policyText,
      queryInfo,
      serviceType: serviceType as any,
      query: originalQuery || queryInfo.toString(),
      userSelectedModel, // ✅ Pass user's model selection
    });
  }

  // ❌ REMOVED: formatPolicyBlockedMessage()
  // Hardcoded string templates violate the LLM-first principle.
  // The response formatter LLM will create natural, contextual messages
  // from the structured data (reasoning, suggestions, missingRequirements).

  /**
   * Get applicable policy for a service
   */
  public getServicePolicy(settings: DMCSettings, service: string): string {
    switch (service) {
      case "hotel":
        return settings.default_hotel_policy || settings.default_sell_policy || "default";
      case "tour":
        return settings.default_tour_policy || settings.default_sell_policy || "default";
      case "transfer":
        return settings.default_transfer_policy || settings.default_sell_policy || "default";
      case "attraction":
        // Attractions don't have a separate policy, use default
        return settings.default_sell_policy || "default";
      default:
        return settings.default_sell_policy || "default";
    }
  }

  /**
   * Check if a specific service is enabled for the DMC
   */
  public isServiceEnabled(settings: DMCSettings, service: string): boolean {
    // This can be extended to check service-specific flags in DMC settings
    // For now, if individual service rates are allowed, all services are enabled
    return settings.allow_individual_service_rates;
  }
}

// Export singleton instance
export const dmcSettingsService = new DMCSettingsService();

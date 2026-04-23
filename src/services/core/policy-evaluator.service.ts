/**
 * Policy Evaluator Service - LLM-Based Dynamic Policy Evaluation
 *
 * CRITICAL PRINCIPLE: NEVER use hardcoded rules for policy evaluation!
 * ALWAYS use LLM to interpret policy text against user query.
 *
 * This service evaluates DMC policies dynamically using LLM understanding,
 * allowing policies to be written in natural language without code changes.
 */

import type { TravelQueryInfo } from "@/types/query-classification";
import { getInternalLLM } from "@/lib/utils/model-config";
import { buildPolicyEvaluatorPrompt } from "@/lib/prompts/policy-evaluator.prompt";

export interface PolicyEvaluationRequest {
  policyText: string;
  queryInfo: TravelQueryInfo;
  serviceType:
    | "hotel"
    | "tour"
    | "transfer"
    | "car_on_disposal"
    | "meals"
    | "guide"
    | "visa"
    | "flights";
  query: string; // Original user query for context
  userSelectedModel?: string; // Model selected by user on frontend
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reasoning: string;
  missingRequirements?: string[];
  suggestions?: string[];
  usage?: any;
}

export class PolicyEvaluatorService {
  /**
   * Evaluate if a query is allowed based on policy text
   *
   * @param request Policy evaluation request with policy text and query info
   * @returns PolicyEvaluationResult with allowed/blocked status and reasoning
   */
  public async evaluatePolicy(
    request: PolicyEvaluationRequest
  ): Promise<PolicyEvaluationResult> {
    const { policyText, queryInfo, serviceType, query, userSelectedModel } =
      request;

    console.log(`[PolicyEvaluator] Evaluating ${serviceType} policy with LLM`);
    console.log(`[PolicyEvaluator] User query: "${query}"`);
    console.log(
      `[PolicyEvaluator] userSelectedModel received: "${userSelectedModel}"`
    );

    try {
      // Get appropriate internal model based on user selection
      console.log(`[PolicyEvaluator] Calling getInternalLLM`);

      const llm = getInternalLLM(0, 1024); // Deterministic with max 1024 tokens

      const prompt = this.buildEvaluationPrompt(
        policyText,
        queryInfo,
        serviceType,
        query
      );

      const response = await llm.invoke(prompt);
      const result = this.parseEvaluationResponse(response.content as string);

      // Extract token usage
      const tokens = (response as any).usage_metadata?.total_tokens || 0;
      if (tokens) {
        result.usage = { total_tokens: tokens };
        console.log(`[PolicyEvaluator] Token usage: ${tokens}`);
      }

      console.log(
        `[PolicyEvaluator] LLM Decision: ${
          result.allowed ? "ALLOWED" : "BLOCKED"
        }`
      );
      console.log(`[PolicyEvaluator] Reasoning: ${result.reasoning}`);

      return result;
    } catch (error) {
      console.error(
        "[PolicyEvaluator] Error evaluating policy with LLM:",
        error
      );

      // Fallback: If LLM fails, be conservative and block
      return {
        allowed: false,
        reasoning:
          "Unable to evaluate policy due to technical error. Please try again.",
        missingRequirements: [],
        suggestions: ["Please contact support if this issue persists"],
      };
    }
  }

  /**
   * Build LLM prompt for policy evaluation using centralized prompt
   */
  private buildEvaluationPrompt(
    policyText: string,
    queryInfo: TravelQueryInfo,
    serviceType: string,
    originalQuery: string
  ): string {
    // Use centralized prompt function

    return buildPolicyEvaluatorPrompt(
      policyText,
      queryInfo,
      serviceType,
      originalQuery
    );
  }

  /**
   * Parse LLM response into PolicyEvaluationResult
   */
  private parseEvaluationResponse(content: string): PolicyEvaluationResult {
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleanedContent);

      return {
        allowed: parsed.allowed === true,
        reasoning: parsed.reasoning || "No reasoning provided",
        missingRequirements: parsed.missingRequirements || [],
        suggestions: parsed.suggestions || [],
      };
    } catch (error) {
      console.error("[PolicyEvaluator] Failed to parse LLM response:", content);
      console.error("[PolicyEvaluator] Parse error:", error);

      // Fallback: Conservative blocking
      return {
        allowed: false,
        reasoning: "Unable to parse policy evaluation result",
        missingRequirements: [],
        suggestions: ["Please try rephrasing your request"],
      };
    }
  }
}

// Export singleton instance
export const policyEvaluatorService = new PolicyEvaluatorService();

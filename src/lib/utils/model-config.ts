/**
 * LLM Model Configuration Utility
 *
 * Simplified configuration using only two models:
 * - LLM_MODEL_GEMINI: Main model for user-facing tasks
 * - LLM_INTERNAL_MODEL_GEMINI: Internal/helper model for lightweight tasks
 */

import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

export interface ModelConfig {
  model: string;
  apiKey: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Get the internal/helper model for lightweight tasks
 * (itinerary extraction, policy evaluation, room selection, etc.)
 *
 * Uses: LLM_INTERNAL_MODEL_GEMINI env variable
 *
 * @param temperature - Temperature setting (default: 0 for deterministic tasks)
 * @param maxOutputTokens - Max output tokens (optional)
 * @returns LLM instance configured with the internal model
 */
/**
 * Get the internal/helper model with Gemini-compatible structured output
 *
 * IMPORTANT: When using withStructuredOutput(), Gemini requires { method: "json_schema" }
 * This wrapper automatically adds that config when withStructuredOutput is called.
 */
export function getInternalLLM(temperature: number = 0, maxOutputTokens?: number) {
  const model = process.env.LLM_INTERNAL_MODEL_GEMINI || "gemini-2.5-flash-lite-preview-06-2025";

  console.log(`[ModelConfig] Internal helper using: ${model}`);

  const effectiveMaxTokens = maxOutputTokens ?? 4096;

  const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY!,
    model,
    temperature,
    maxOutputTokens: effectiveMaxTokens,
    thinkingConfig: {
      thinkingBudget: 0,
      includeThoughts: false,
    },
  });

  return llm;
}

/**
 * Get the main model for user-facing tasks
 * (main workflow, response formatting, pricing calculations)
 *
 * Uses: LLM_MODEL_GEMINI env variable
 *
 * @param temperature - Temperature setting (default: 0 for deterministic responses)
 * @param maxOutputTokens - Max output tokens (optional)
 * @returns LLM instance configured with the main model
 */
export function getUserLLM(temperature: number = 0, maxOutputTokens?: number): ChatOpenAI {
  const model = process.env.LLM_MODEL_GEMINI || "gemini-2.5-flash-preview-09-2025";

  console.log(`[ModelConfig] Main agent using: ${model}`);

  // return new ChatGoogleGenerativeAI({
  //   apiKey: process.env.GEMINI_API_KEY!,
  //   model,
  //   temperature,
  //   maxOutputTokens,
  // });

  return new ChatOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY!,
    model,
    temperature,
    maxTokens: maxOutputTokens,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });
}

/**
 * Get an OpenRouter LLM instance
 * Supports various models via OpenRouter's unified API (Qwen, Llama, Claude, etc.)
 *
 * Uses: OPENROUTER_API_KEY env variable
 * Model: OPENROUTER_LLM_MODEL env variable
 *
 * @param temperature - Temperature setting (default: 0)
 * @param maxTokens - Max output tokens (optional)
 * @param modelOverride - Override the default model (optional)
 * @returns ChatOpenAI instance configured for OpenRouter
 */
export function getOpenRouterLLM(temperature: number = 0, maxTokens?: number, modelOverride?: string): ChatOpenAI {
  const model = modelOverride || process.env.OPENROUTER_LLM_MODEL || "qwen/qwen3-next-80b-a3b-instruct";

  console.log(`[ModelConfig] OpenRouter using: ${model}`);

  return new ChatOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY!,
    model,
    temperature,
    maxTokens,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });
}

/**
 * Validate that required environment variables are set
 */
export function validateModelConfig(): void {
  const errors: string[] = [];

  if (!process.env.GEMINI_API_KEY) {
    errors.push("GEMINI_API_KEY is not set");
  }

  if (!process.env.LLM_MODEL_GEMINI) {
    console.warn("[ModelConfig] LLM_MODEL_GEMINI not set, using default: gemini-2.5-flash-preview-09-2025");
  }

  if (!process.env.LLM_INTERNAL_MODEL_GEMINI) {
    console.warn(
      "[ModelConfig] LLM_INTERNAL_MODEL_GEMINI not set, using default: gemini-2.5-flash-lite-preview-09-2025"
    );
  }

  if (errors.length > 0) {
    console.error("[ModelConfig] Configuration errors:", errors);
  }
}

// ============================================================================
// STRUCTURED OUTPUT HELPER
// ============================================================================

export type ModelType = "user" | "internal" | "openrouter";

export interface InvokeStructuredOptions {
  model?: ModelType; // "user" (default) | "internal" | "openrouter"
  temperature?: number;
  name?: string;
  maxTokens?: number;
  openRouterModel?: string; // Override model for OpenRouter
}

/**
 * Invoke LLM with structured output - handles everything in one call
 * - Schema binding with withStructuredOutput
 * - Token extraction from raw response
 * - Supports all 3 model types: getUserLLM, getInternalLLM, getOpenRouterLLM
 *
 * @param prompt - The prompt to send
 * @param schema - Zod schema for structured output
 * @param options - Model type, temperature, operation name for logging
 * @returns { parsed: T, tokens: number }
 *
 * @example
 * // Default: getUserLLM
 * const { parsed, tokens } = await invokeStructured(prompt, PriceSchema);
 *
 * @example
 * // Use internal model (lightweight tasks)
 * const { parsed, tokens } = await invokeStructured(prompt, IntentSchema, {
 *   model: "internal",
 *   name: "intent_detection"
 * });
 *
 * @example
 * // Use OpenRouter with specific model
 * const { parsed, tokens } = await invokeStructured(prompt, AnalysisSchema, {
 *   model: "openrouter",
 *   openRouterModel: "qwen/qwen3-next-80b-a3b-instruct",
 *   temperature: 0.3
 * });
 */
export async function invokeStructured<T extends z.ZodType>(
  prompt: string,
  schema: T,
  options?: InvokeStructuredOptions
): Promise<{ parsed: z.infer<T>; tokens: number }> {
  const temp = options?.temperature ?? 0;
  const maxTokens = options?.maxTokens;

  // Select model based on type
  let llm: ChatOpenAI | ChatGoogleGenerativeAI;

  switch (options?.model) {
    case "internal":
      llm = getInternalLLM(temp, maxTokens);
      break;
    case "openrouter":
      llm = getOpenRouterLLM(temp, maxTokens, options?.openRouterModel);
      break;
    case "user":
    default:
      llm = getUserLLM(temp, maxTokens);
      break;
  }

  // Standard config - LangChain handles provider-specific details automatically
  // Key: use .optional() instead of .nullable() in Zod schemas for Gemini compatibility
  const structuredConfig = { includeRaw: true as const, name: options?.name ?? "structured_response" };

  const structured = llm.withStructuredOutput(schema, structuredConfig);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = (await structured.invoke(prompt)) as any;
  const tokens = response.raw?.usage_metadata?.total_tokens || 0;

  return { parsed: response.parsed, tokens };
}

/**
 * Transform null values to undefined recursively
 * Needed because Zod .nullable() returns T | null, but TypeScript interfaces expect T | undefined
 *
 * @param obj - Object with potential null values
 * @returns Object with null values converted to undefined
 */
export function transformNullToUndefined<T>(obj: T): T {
  if (obj === null) return undefined as T;
  if (Array.isArray(obj)) return obj.map(transformNullToUndefined) as T;
  if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, transformNullToUndefined(v)])) as T;
  }
  return obj;
}

import { z } from "zod";

// Zod schema for AI-generated tour information
export const AITourDataSchema = z.object({
  description: z
    .string()
    .describe(
      "A compelling 2-3 sentence description of the tour highlighting key attractions and experiences"
    ),
  cancellation_policy: z
    .string()
    .describe(
      "Clear cancellation policy for the tour including timeframes and refund conditions"
    ),
  child_policy: z
    .string()
    .describe(
      "Policy regarding children including age limits, discounts, and special requirements"
    ),
  currency: z
    .string()
    .describe(
      "Primary currency for pricing at this location (3-letter ISO code like USD, EUR, etc.)"
    ),
  state: z
    .string()
    .describe("State or province name where the attraction is located"),
  city: z.string().describe("City name where the attraction is located"),
});

export type AITourData = z.infer<typeof AITourDataSchema>;

// Interface for place information to send to AI
interface PlaceInfo {
  name: string;
  address: string;
  types: string[];
  country?: string;
  rating?: number;
  reviewSummary?: string;
  website?: string;
}

/**
 * Generate tour information using Gemini AI
 */
export async function generateTourInfo(
  placeInfo: PlaceInfo
): Promise<AITourData> {
  try {
    // Call our secure server-side API route
    const response = await fetch("/api/ai/generate-tour-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(placeInfo),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Validate against our schema
    return AITourDataSchema.parse(data);
  } catch (error) {
    console.error("Error generating tour info with Gemini AI:", error);

    // Return fallback data if AI fails
    return generateFallbackData(placeInfo);
  }
}

/**
 * Generate fallback data when AI fails
 */
function generateFallbackData(placeInfo: PlaceInfo): AITourData {
  // Basic currency mapping by common patterns
  const getCurrency = (address: string): string => {
    const addressLower = address.toLowerCase();
    if (addressLower.includes("usa") || addressLower.includes("united states"))
      return "USD";
    if (
      addressLower.includes("uk") ||
      addressLower.includes("england") ||
      addressLower.includes("scotland") ||
      addressLower.includes("wales")
    )
      return "GBP";
    if (addressLower.includes("canada")) return "CAD";
    if (addressLower.includes("australia")) return "AUD";
    if (addressLower.includes("india")) return "INR";
    if (addressLower.includes("japan")) return "JPY";
    if (addressLower.includes("singapore")) return "SGD";
    // Default to USD for other countries
    return "USD";
  };

  // Extract state and city from address
  const extractStateCity = (address: string) => {
    const parts = address.split(",").map((part) => part.trim());

    if (parts.length >= 3) {
      return {
        city: parts[parts.length - 3] || placeInfo.name.split(" ")[0],
        state: parts[parts.length - 2] || "Unknown",
      };
    } else if (parts.length >= 2) {
      return {
        city: parts[0] || placeInfo.name.split(" ")[0],
        state: parts[1] || "Unknown",
      };
    }

    return {
      city: placeInfo.name.split(" ")[0] || "Unknown",
      state: "Unknown",
    };
  };

  const { city, state } = extractStateCity(placeInfo.address);

  return {
    description: `Experience the amazing ${placeInfo.name}, a popular ${placeInfo.types[0]?.replace(/_/g, " ") || "attraction"} that offers unique experiences and memorable moments for visitors.`,
    cancellation_policy:
      "Free cancellation up to 24 hours before the tour starts. Cancellations within 24 hours are subject to a 50% cancellation fee. No refund for no-shows.",
    child_policy:
      "Children under 3 years are free. Children 3-12 years receive a 25% discount. Children must be accompanied by an adult at all times.",
    currency: getCurrency(placeInfo.address),
    state: state,
    city: city,
  };
}

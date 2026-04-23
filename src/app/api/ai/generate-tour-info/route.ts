import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenAI, Type } from "@google/genai";
import { env } from "@/lib/env";

// Input validation schema
const GenerateTourInfoSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  types: z.array(z.string()),
  country: z.string().optional(),
  rating: z.number().optional(),
  reviewSummary: z.string().optional(),
  website: z.string().optional(),
});

// Output schema for structured response
const AITourDataSchema = z.object({
  description: z.string(),
  cancellation_policy: z.string(),
  child_policy: z.string(),
  currency: z.string(),
  state: z.string(),
  city: z.string(),
});

// Gemini Structured Output Schema using new @google/genai package
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description:
        "A compelling 2-3 sentence description of the tour highlighting key attractions and experiences",
    },
    cancellation_policy: {
      type: Type.STRING,
      description:
        "Clear cancellation policy for the tour including timeframes and refund conditions",
    },
    child_policy: {
      type: Type.STRING,
      description:
        "Policy regarding children including age limits, discounts, and special requirements",
    },
    currency: {
      type: Type.STRING,
      description:
        "Primary currency for pricing at this location (3-letter ISO code like USD, EUR, etc.)",
    },
    state: {
      type: Type.STRING,
      description: "State or province name where the attraction is located",
    },
    city: {
      type: Type.STRING,
      description: "City name where the attraction is located",
    },
  },
  required: [
    "description",
    "cancellation_policy",
    "child_policy",
    "currency",
    "state",
    "city",
  ],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const placeInfo = GenerateTourInfoSchema.parse(body);

    // Check if API key is available
    if (!env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not found in environment variables");
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    // Initialize Gemini AI with structured output (following official documentation pattern)all
    const ai = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
    });

    const config = {
      responseMimeType: "application/json",
      responseSchema,
    };

    const model = env.GEMINI_MODEL;
    const prompt = createPrompt(placeInfo);

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ];

    // Generate content with structured output
    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });

    const text = response.text;

    if (!text) {
      throw new Error("Empty response from Gemini AI");
    }

    // With structured output, the response should already be valid JSON
    const parsedData = JSON.parse(text);

    // Validate with our Zod schema
    const validatedData = AITourDataSchema.parse(parsedData);

    return NextResponse.json(validatedData);
  } catch (error) {
    console.error("Error in generate-tour-info API:", error);

    // Return fallback data if AI fails
    const body = await request.json().catch(() => ({}));
    const fallbackData = generateFallbackData(body);

    return NextResponse.json(fallbackData);
  }
}

/**
 * Create a detailed prompt for Gemini AI with structured output
 */
function createPrompt(
  placeInfo: z.infer<typeof GenerateTourInfoSchema>
): string {
  return `You are a travel expert creating tour information for a destination. Based on the following place information, generate comprehensive tour details.

Place Information:
- Name: ${placeInfo.name}
- Address: ${placeInfo.address}
- Types: ${placeInfo.types.join(", ")}
- Country: ${placeInfo.country || "Unknown"}
- Rating: ${placeInfo.rating ? `${placeInfo.rating}/5` : "Not available"}
- Website: ${placeInfo.website || "Not available"}
${placeInfo.reviewSummary ? `- Reviews: ${placeInfo.reviewSummary}` : ""}

Please provide:
- A compelling description highlighting what makes this attraction special
- A professional cancellation policy with clear timeframes and refund terms
- A comprehensive child policy including age limits and discounts
- The correct currency code for this location
- The accurate state/province and city names

Make the content engaging, professional, and suitable for a travel booking platform.`;
}

/**
 * Generate fallback data when AI fails
 */
function generateFallbackData(
  placeInfo: any
): z.infer<typeof AITourDataSchema> {
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
  const extractStateCity = (address: string, name: string) => {
    const parts = address.split(",").map((part) => part.trim());

    if (parts.length >= 3) {
      return {
        city: parts[parts.length - 3] || name.split(" ")[0],
        state: parts[parts.length - 2] || "Unknown",
      };
    } else if (parts.length >= 2) {
      return {
        city: parts[0] || name.split(" ")[0],
        state: parts[1] || "Unknown",
      };
    }

    return {
      city: name.split(" ")[0] || "Unknown",
      state: "Unknown",
    };
  };

  const address = placeInfo.address || "";
  const name = placeInfo.name || "Unknown";
  const { city, state } = extractStateCity(address, name);

  return {
    description: `Experience the amazing ${name}, a popular ${
      placeInfo.types?.[0]?.replace(/_/g, " ") || "attraction"
    } that offers unique experiences and memorable moments for visitors.`,
    cancellation_policy:
      "Free cancellation up to 24 hours before the tour starts. Cancellations within 24 hours are subject to a 50% cancellation fee. No refund for no-shows.",
    child_policy:
      "Children under 3 years are free. Children 3-12 years receive a 25% discount. Children must be accompanied by an adult at all times.",
    currency: getCurrency(address),
    state: state,
    city: city,
  };
}

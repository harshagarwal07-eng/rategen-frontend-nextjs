import { z } from "zod";

/**
 * Comprehensive validation schemas for travel agent inputs
 * Prevents malformed requests and ensures data integrity
 */

// Base schemas
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format"
}).refine(date => {
  const parsed = new Date(date);
  const now = new Date();
  return !isNaN(parsed.getTime()) && parsed >= now;
}, {
  message: "Date cannot be in the past"
});

const CountryNameSchema = z.string()
  .min(2, "Country name must be at least 2 characters")
  .max(100, "Country name too long")
  .regex(/^[a-zA-Z\s]+$/, "Country name must contain only letters and spaces")
  .transform(val => val.trim().toLowerCase());

const SearchTextSchema = z.string()
  .min(1, "Search text cannot be empty")
  .max(500, "Search text too long")
  .transform(val => val.trim());

const DmcIdSchema = z.string()
  .min(1, "DMC ID cannot be empty")
  .max(50, "DMC ID too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "DMC ID can only contain letters, numbers, underscores, and hyphens");

// Number schemas
const PositiveIntegerSchema = z.number()
  .int("Must be a whole number")
  .positive("Must be greater than 0")
  .max(100, "Number seems too high");

const AgeSchema = z.number()
  .int("Age must be a whole number")
  .min(0, "Age cannot be negative")
  .max(120, "Age seems unrealistic");

// Travel agent specific schemas
export const TravelAgentQuerySchema = z.object({
  // Core query information
  query: z.string()
    .min(1, "Query cannot be empty")
    .max(2000, "Query too long")
    .transform(val => val.trim()),

  // DMC identification
  dmc_id: DmcIdSchema.optional(),
  chat_id: z.string().uuid().optional(),

  // Travel details
  destinations: z.array(z.string().min(1)).optional(),
  country_name: CountryNameSchema.optional(),
  dates: z.array(DateSchema).max(2, "Can only have start and end dates").optional(),
  no_of_nights: PositiveIntegerSchema.max(365, "Duration cannot exceed 365 nights").optional(),

  // Traveler information
  num_people: PositiveIntegerSchema.max(50, "Group size too large").optional(),
  children: z.array(z.object({
    age: AgeSchema
  })).max(20, "Too many children").optional(),

  // Additional preferences
  budget: z.string().max(100, "Budget description too long").optional(),
  interests: z.array(z.string().max(50, "Interest description too long")).max(20, "Too many interests").optional(),
  search_text: SearchTextSchema.optional(),

  // Service specific
  service_type: z.enum(["tour", "hotel", "transfer"]).optional(),
  service_id: z.string().max(100, "Service ID too long").optional(),

  // Request classification
  request_type: z.enum(["itinerary", "quote", "individual_rate", "general", "followup"]).optional(),
  is_followup: z.boolean().optional(),

  // Model preferences
  model: z.enum(["gpt-5-mini", "gemini-2.5-flash"]).optional()
}).superRefine((data, ctx) => {
  // Custom validation rules

  // Rule 1: Must have at least destination or country
  if (!data.destinations?.length && !data.country_name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Must specify either destinations or country_name",
      path: ["destinations"]
    });
  }

  // Rule 2: If individual_rate, must have service_type and service_id
  if (data.request_type === "individual_rate") {
    if (!data.service_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "service_type is required for individual_rate requests",
        path: ["service_type"]
      });
    }
    if (!data.service_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "service_id is required for individual_rate requests",
        path: ["service_id"]
      });
    }
  }

  // Rule 3: If dates provided, validate date range
  if (data.dates && data.dates.length === 2) {
    const [start, end] = data.dates.map(d => new Date(d));
    if (start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date",
        path: ["dates"]
      });
    }

    // Calculate nights if not provided
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (data.no_of_nights && data.no_of_nights !== nights) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `no_of_nights (${data.no_of_nights}) doesn't match date range (${nights})`,
        path: ["no_of_nights"]
      });
    }
  }

  // Rule 4: Children ages must make sense
  if (data.children && data.children.length > 0) {
    const totalTravelers = (data.num_people || 0) + data.children.length;
    if (totalTravelers > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total group size (adults + children) cannot exceed 50",
        path: ["num_people"]
      });
    }
  }

  // Rule 5: Budget validation (basic format check)
  if (data.budget) {
    const budgetLower = data.budget.toLowerCase();
    const validBudgetPatterns = [
      /^\$\d+/, // Starts with $ and numbers
      /\d+ USD/, // Contains numbers and USD
      /\d+-\d+/, // Range format
      /^under \$/i, // "under $"
      /^max \$/i // "max $"
    ];

    const isValidBudget = validBudgetPatterns.some(pattern => pattern.test(budgetLower));
    if (!isValidBudget && !budgetLower.includes("contact") && !budgetLower.includes("quote")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Budget format unclear. Use formats like '$500', '1000-2000 USD', 'under $1000', etc.",
        path: ["budget"]
      });
    }
  }
});

// MCP Tool specific schemas
export const MCPTourListSchema = z.object({
  dmc_id: DmcIdSchema,
  search_text: SearchTextSchema,
  country_name: CountryNameSchema
});

export const MCPHotelListSchema = z.object({
  dmc_id: DmcIdSchema,
  search_text: SearchTextSchema,
  country_name: CountryNameSchema
});

export const MCPTransferListSchema = z.object({
  dmc_id: DmcIdSchema,
  search_text: SearchTextSchema,
  country_name: CountryNameSchema
});

export const MCPGetTourDetailsSchema = z.object({
  tour_id: z.string().min(1, "Tour ID cannot be empty")
});

export const MCPGetHotelDetailsSchema = z.object({
  hotel_id: z.string().min(1, "Hotel ID cannot be empty")
});

export const MCPGetTransferDetailsSchema = z.object({
  transfer_id: z.string().min(1, "Transfer ID cannot be empty")
});

export const MCPServiceRatesSchema = z.object({
  dmc_id: DmcIdSchema,
  service_type: z.enum(["tour", "hotel", "transfer"]),
  service_id: z.string().min(1, "Service ID cannot be empty"),
  num_people: PositiveIntegerSchema.max(50, "Group size too large"),
  date_from: DateSchema.optional()
});

export const MCPDmcSettingsSchema = z.object({
  dmc_id: DmcIdSchema
});

export const MCPDefaultPoliciesSchema = z.object({
  dmc_id: DmcIdSchema,
  country_name: CountryNameSchema.optional()
});

export const MCPDefaultTravelThemeSchema = z.object({
  dmc_id: DmcIdSchema,
  country_name: CountryNameSchema.optional()
});

export const MCPDefaultSellPolicySchema = z.object({
  dmc_id: DmcIdSchema,
  country_name: CountryNameSchema.optional()
});

export const MCPItineraryAgentSchema = z.object({
  dmc_id: DmcIdSchema,
  country_name: CountryNameSchema.optional(),
  no_of_nights: z.string().transform(val => parseInt(val)).pipe(
    PositiveIntegerSchema.max(365, "Duration too long")
  ).optional()
});

// Validation functions
export function validateTravelAgentQuery(data: unknown) {
  return TravelAgentQuerySchema.safeParse(data);
}

export function validateMCPCall(toolName: string, args: unknown) {
  switch (toolName) {
    case "ToursList":
      return MCPTourListSchema.safeParse(args);
    case "HotelsList":
      return MCPHotelListSchema.safeParse(args);
    case "TransfersList":
      return MCPTransferListSchema.safeParse(args);
    case "GetTourDetails":
      return MCPGetTourDetailsSchema.safeParse(args);
    case "GetHotelDetails":
      return MCPGetHotelDetailsSchema.safeParse(args);
    case "GetTransferDetails":
      return MCPGetTransferDetailsSchema.safeParse(args);
    case "ServiceRates":
      return MCPServiceRatesSchema.safeParse(args);
    case "DmcSettings":
      return MCPDmcSettingsSchema.safeParse(args);
    case "DefaultPolicies":
      return MCPDefaultPoliciesSchema.safeParse(args);
    case "DefaultTravelTheme":
      return MCPDefaultTravelThemeSchema.safeParse(args);
    case "DefaultSellPolicy":
      return MCPDefaultSellPolicySchema.safeParse(args);
    case "ItineraryAgent":
      return MCPItineraryAgentSchema.safeParse(args);
    default:
      return { success: false, error: new Error(`Unknown tool: ${toolName}`) };
  }
}

// Error formatting utilities
export function formatValidationError(error: any): string {
  if (!error.issues) {
    return error.message || "Validation failed";
  }

  return error.issues.map((issue: any) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  }).join("; ");
}

// Sanitization utilities
export function sanitizeQuery(query: string): string {
  return query
    .trim()
    // Remove excessive whitespace
    .replace(/\s+/g, " ")
    // Remove potentially harmful characters but keep basic punctuation
    .replace(/[<>]/g, "")
    // Limit length
    .substring(0, 2000);
}

export function sanitizeSearchText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[<>]/g, "")
    .substring(0, 500);
}

// Validation middleware
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>,
  source: string = "request"
) {
  return (data: unknown): { data?: T; error?: string } => {
    const result = schema.safeParse(data);

    if (!result.success) {
      const error = formatValidationError(result.error);
      console.warn(`⚠️ [VALIDATION] ${source} validation failed:`, error);
      return { error };
    }

    return { data: result.data };
  };
}

// Export types
export type TravelAgentQuery = z.infer<typeof TravelAgentQuerySchema>;
export type MCPTourListParams = z.infer<typeof MCPTourListSchema>;
export type MCPHotelListParams = z.infer<typeof MCPHotelListSchema>;
export type MCPTransferListParams = z.infer<typeof MCPTransferListSchema>;
export type MCPGetTourDetailsParams = z.infer<typeof MCPGetTourDetailsSchema>;
export type MCPGetHotelDetailsParams = z.infer<typeof MCPGetHotelDetailsSchema>;
export type MCPGetTransferDetailsParams = z.infer<typeof MCPGetTransferDetailsSchema>;
export type MCPServiceRatesParams = z.infer<typeof MCPServiceRatesSchema>;
export type MCPDmcSettingsParams = z.infer<typeof MCPDmcSettingsSchema>;
export type MCPDefaultPoliciesParams = z.infer<typeof MCPDefaultPoliciesSchema>;
export type MCPDefaultTravelThemeParams = z.infer<typeof MCPDefaultTravelThemeSchema>;
export type MCPDefaultSellPolicyParams = z.infer<typeof MCPDefaultSellPolicySchema>;
export type MCPItineraryAgentParams = z.infer<typeof MCPItineraryAgentSchema>;
import * as z from "zod";

const AgeRangeSchema = z
  .object({
    from: z.number().min(0, "Age must be at least 0").max(99, "Age must be at most 99"),
    to: z.number().min(0, "Age must be at least 0").max(99, "Age must be at most 99"),
  })
  .refine((data) => data.from <= data.to, {
    message: "From age must be less than or equal to To age",
  });

const AgePolicySchema = z.object({
  adult: z.object({ meals: AgeRangeSchema.optional() }),
  teenager: z.object({ meals: AgeRangeSchema.optional() }).optional(),
  child: z.object({ meals: AgeRangeSchema.optional() }).optional(),
  infant: z.object({ meals: AgeRangeSchema.optional() }).optional(),
});

const MealRatesSchema = z.object({
  adult: z.number().min(0, "Rate must be at least 0").nullable().optional(),
  teenager: z.number().min(0, "Rate must be at least 0").nullable().optional(),
  child: z.number().min(0, "Rate must be at least 0").nullable().optional(),
  infant: z.number().min(0, "Rate must be at least 0").nullable().optional(),
});

const MealPlanRateEntrySchema = z.object({
  meal_type: z.string(),
  cuisine: z.string(),
  option: z.string(),
  rates: MealRatesSchema.optional(),
});

const MealPlanRatesSchema = z.array(MealPlanRateEntrySchema).optional();

// Combined Schema
export const MealsDatastoreSchema = z.object({
  id: z.string().optional(),
  meal_name: z.string().min(2, { message: "Meal name must be at least 2 characters." }),
  description: z.string().optional(),
  country: z.string().uuid({ message: "Country is required" }),
  state: z.string().optional(),
  city: z.string().uuid({ message: "City is required" }),
  currency: z.string().optional(),
  images: z.array(z.string()).optional(),
  examples: z.string().optional(),
  inclusions: z.string().optional(),
  exclusions: z.string().optional(),
  preferred: z.boolean().optional(),
  markup: z.number().optional(),
  remarks: z.string().optional(),
  notes: z.string().optional(),
  menu_link: z.string().optional(),
  cancellation_policy: z.string().optional(),
  age_policy: AgePolicySchema.optional(),
  meal_plan_rates: MealPlanRatesSchema.optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
  meal_datastore_id: z.string().nullable().optional(),
  is_unlinked: z.string().nullable().optional(),
});

export type IMealsDatastore = z.infer<typeof MealsDatastoreSchema>;

import * as z from "zod";

// Re-use age policy schema from tours
const AgePolicySchema = z.object({
  infant: z
    .object({
      min_age: z.number(),
      max_age: z.number(),
    })
    .optional(),
  child: z
    .object({
      min_age: z.number(),
      max_age: z.number(),
    })
    .optional(),
  teenager: z
    .object({
      min_age: z.number(),
      max_age: z.number(),
    })
    .optional(),
  adult: z
    .object({
      min_age: z.number(),
      max_age: z.number(),
    })
    .optional(),
});

// Combo item schema (reference to tour/transfer package)
const ComboItemSchema = z.object({
  id: z.string().optional(),
  combo_id: z.string().optional(),
  item_type: z.enum(["tour", "transfer"]),
  tour_id: z.string().uuid().optional().nullable(),
  transfer_id: z.string().uuid().optional().nullable(),
  tour_package_id: z.string().uuid().optional().nullable(),
  transfer_package_id: z.string().uuid().optional().nullable(),
  package_name: z.string().optional(),
  order: z.number().optional(),
  // Joined fields for display
  tour_name: z.string().optional(),
  transfer_name: z.string().optional(),
  source_package: z.any().optional(), // Full package data for age policy copying
});

// Season schema for combos (same as tours)
const ComboSeasonSchema = z.object({
  id: z.string().optional(),
  combo_id: z.string().optional(),
  dates: z.string().optional(),
  blackout_dates: z.string().optional(),
  exception_rules: z.string().optional(),
  order: z.number().optional(),
  // Per-pax rates
  ticket_only_rate_adult: z.coerce.number().optional(),
  ticket_only_rate_child: z.coerce.number().optional(),
  ticket_only_rate_teenager: z.coerce.number().optional(),
  ticket_only_rate_infant: z.coerce.number().optional(),
  sic_rate_adult: z.coerce.number().optional(),
  sic_rate_child: z.coerce.number().optional(),
  sic_rate_teenager: z.coerce.number().optional(),
  sic_rate_infant: z.coerce.number().optional(),
  // Per-vehicle rates
  pvt_rate: z.record(z.string(), z.coerce.number()).optional(),
  per_vehicle_rate: z
    .array(
      z.object({
        rate: z.coerce.number().optional(),
        brand: z.string().optional(),
        capacity: z.string().optional(),
        vehicle_type: z.string().optional(),
      })
    )
    .optional(),
  total_rate: z.coerce.number().optional(),
});

// Combo type enum - determines how packages in the combo are applied
export const ComboTypeEnum = z.enum(["AND", "OR"]);
export type ComboType = z.infer<typeof ComboTypeEnum>;

// Main combo schema
export const CombosDatastoreSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(), // Auto-generated from package names
  remarks: z.string().optional(),
  combo_type: ComboTypeEnum.optional().default("AND"), // AND = all packages required, OR = any package can be selected
  min_packages: z.coerce.number().min(2).optional().default(2), // Minimum packages required (can't be lower than 2)
  max_packages: z.coerce.number().min(2).optional(), // Maximum packages allowed (optional)
  age_policy: AgePolicySchema.optional(),
  currency: z.string().optional(),
  country: z.string().uuid().optional(),
  state: z.string().optional(),
  city: z.string().uuid().optional(),
  created_by: z.string().optional(),
  dmc_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  // Relations
  items: z.array(ComboItemSchema).optional(),
  seasons: z.array(ComboSeasonSchema).optional(),
  // Computed fields for display
  items_count: z.number().optional(),
  seasons_count: z.number().optional(),
  // Joined fields for display
  country_name: z.string().optional(),
  city_name: z.string().optional(),
});

// Form-specific schema with validation for minimum items
export const ComboFormSchema = CombosDatastoreSchema.refine(
  (data) => {
    // Require at least 2 items
    return data.items && data.items.length >= 2;
  },
  {
    message: "A combo must have at least 2 packages",
    path: ["items"],
  }
);

// Export types
export type IAgePolicy = z.infer<typeof AgePolicySchema>;
export type IComboItem = z.infer<typeof ComboItemSchema>;
export type IComboSeason = z.infer<typeof ComboSeasonSchema>;
// Use z.input for form fields that have defaults (so they can be optional in the form)
export type ICombo = z.input<typeof CombosDatastoreSchema>;
export type IComboForm = z.infer<typeof ComboFormSchema>;

// Export schemas for reuse
export { AgePolicySchema, ComboItemSchema, ComboSeasonSchema };

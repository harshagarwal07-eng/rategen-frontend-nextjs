import * as z from "zod";

// Guides Datastore Schema
export const GuidesDatastoreSchema = z.object({
  id: z.string().optional(),
  // General Info
  guide_type: z.string().min(2, {
    message: "Guide type must be at least 2 characters.",
  }),
  description: z.string().optional(),
  per_day_rate: z.number().optional(),
  language: z.string().optional(),
  currency: z.string().optional(),
  country: z.string().uuid().optional(),
  state: z.string().optional(),
  city: z.string().uuid().optional(),
  examples: z.string().optional(),
  preferred: z.boolean().optional(),
  markup: z.number().optional(),
  images: z.array(z.string()).optional(),
  // Policies & Remarks
  cancellation_policy: z.string().optional(),
  remarks: z.string().optional(),
  notes: z.string().optional(),
  inclusions: z.string().optional(),
  exclusions: z.string().optional(),
  guide_datastore_id: z.string().nullable().optional(),
  is_unlinked: z.boolean().optional(),
});

export type IGuidesDatastore = z.infer<typeof GuidesDatastoreSchema>;

import * as z from "zod";

export const CarOnDisposalDatastoreSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: "Name must be at least 2 characers." }),
  brand: z.string().optional(),
  country: z.string().uuid({ message: "Country is required" }),
  currency: z.string().optional(),
  capacity: z.number().optional(),
  description: z.string().optional(),
  route: z.string().optional(),
  rate_per_km: z.number().optional(),
  min_km_per_day: z.number().optional(),
  max_hrs_per_day: z.number().optional(),
  surcharge_per_hr: z.number().optional(),
  vbp_rate: z.number().optional(),
  vbp_max_hrs_per_day: z.number().optional(),
  vbp_surcharge_per_hr: z.number().optional(),
  vbp_max_km_per_day: z.number().optional(),
  vbp_surcharge_per_km: z.number().optional(),
  images: z.array(z.string()).default([]),
  cancellation_policy: z.string().optional(),
  remarks: z.string().optional(),
  examples: z.string().optional(),
  preferred: z.boolean().default(false),
  markup: z.number().optional(),
});

export type ICarOnDisposalDatastore = z.infer<
  typeof CarOnDisposalDatastoreSchema
>;

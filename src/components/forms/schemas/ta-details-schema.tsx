import * as z from "zod";

export const TaDetailsSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  website: z.string().optional(),
  admin_name: z.string().optional(),
  admin_phone: z.string().optional(),
  category: z.string().optional(),
  source: z.string().optional(),
});

export type ITaDetailsForm = z.infer<typeof TaDetailsSchema>;

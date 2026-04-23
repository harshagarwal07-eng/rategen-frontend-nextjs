import * as z from "zod";

export const QueryFormSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  ta_id: z.string().uuid({
    message: "Travel agency is required.",
  }),
  traveler_name: z.string().min(2, {
    message: "Traveler name must be at least 2 characters.",
  }),
  nationality: z.string().uuid().optional(),
  travel_date: z.coerce.date(),
  travel_countries: z.array(z.string().uuid()).optional(),
  message: z.string().optional(),
  pax_details: z.object({
    adults: z.number().min(1, "At least one adult is required"),
    children: z.number().min(0),
    children_ages: z.array(z.number().min(0).max(17)).optional(),
  }),
  source: z.string().uuid().optional(),
  query_type: z.string().optional(),
  services: z.array(z.string()).optional(),
  duration: z.number().min(1).max(60).optional(),
});

export type IQueryForm = z.infer<typeof QueryFormSchema>;

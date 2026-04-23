import { z } from "zod";

export const libraryTaskFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum(["hotel", "tour", "transfer", "meal", "guide", "package", "finance", "on_trip"]),
  service_category: z.union([z.enum(["hotel", "tour", "transfer"]), z.null()]),
  scope_mode: z.enum(["all", "inclusive", "exclusive"]),
  service_map_ids: z.array(z.string()),
  offset_reference: z.enum(["booking_confirm", "trip_start", "service_date"]),
  offset_direction: z.enum(["before", "after"]),
  offset_value: z.coerce.number().min(0),
  offset_unit: z.enum(["minute", "hour", "day"]),
  is_active: z.boolean(),
  default_assignees: z.array(z.string()).optional(),
});

export type LibraryTaskFormValues = z.infer<typeof libraryTaskFormSchema>;

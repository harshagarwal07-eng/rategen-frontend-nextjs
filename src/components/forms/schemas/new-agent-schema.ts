import * as z from "zod";

export const NewAgentSchema = z.object({
  // TA details
  name: z.string().min(1, "Agency name is required"),
  website: z.string().optional(),
  streetAddress: z.string().optional(),
  city_id: z.string().min(1, "City is required"),
  country_id: z.string().min(1, "Country is required"),
  // Admin details
  adminName: z.string().min(1, "Admin name is required"),
  adminEmail: z.string().email("Invalid email address"),
  adminPhone: z.string().min(1, "Phone is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type INewAgentForm = z.infer<typeof NewAgentSchema>;

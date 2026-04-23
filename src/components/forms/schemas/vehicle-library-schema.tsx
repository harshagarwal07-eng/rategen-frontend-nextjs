import { z } from "zod";

export const vehicleLibraryFormSchema = z.object({
  status: z.enum(["active", "inactive", "blacklist"]).default("active"),
  brand: z.string().optional(),
  v_type: z.string().optional(),
  yr_of_reg: z.number().optional(),
  v_number: z.string().min(1, "Vehicle number is required"),
  owned_by: z.object({
    type: z.enum(["company", "supplier", "custom"]),
    supplier_id: z.string().optional(),
    notes: z.string().optional(),
  }),
  images: z.array(z.string()).default([]),
});

export type VehicleLibraryFormData = z.infer<typeof vehicleLibraryFormSchema>;

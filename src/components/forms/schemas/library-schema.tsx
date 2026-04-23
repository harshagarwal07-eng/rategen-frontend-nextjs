import { z } from "zod";

// ============================================
// VEHICLE LIBRARY
// ============================================

export const vehicleLibraryFormSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  v_type: z.string().min(1, "Vehicle type is required"),
  category: z.string().min(1, "Category is required"),
  yr_of_reg: z
    .number()
    .min(1900, "Year must be 1900 or later")
    .max(new Date().getFullYear(), "Year cannot be in the future"),
  v_number: z.string().min(1, "Vehicle number is required"),
  status: z.string().min(1, "Status is required"),
  owned_by_type: z.string().min(1, "Ownership type is required"),
  supplier_id: z.string().optional().nullable(),
  owned_by_notes: z.string().optional().nullable(),
  images: z.array(z.string()),
  country: z.string().uuid().nullable().optional(),
  state: z.string().uuid().nullable().optional(),
  city: z.string().uuid().nullable().optional(),
});

export type VehicleLibraryFormData = z.infer<typeof vehicleLibraryFormSchema>;

// ============================================
// DRIVER LIBRARY
// ============================================

export const driverLibraryFormSchema = z.object({
  name: z.string().min(1, "Driver name is required"),
  gender: z.string().min(1, "Gender is required"),
  phone: z.string().min(1, "Phone number is required"),
  whatsapp_number: z.string().optional(),
  languages_known: z.array(z.string()).min(1, "At least one language is required"),
  status: z.string().min(1, "Status is required"),
  payroll_type: z.string().min(1, "Payroll type is required"),
  supplier_id: z.string().optional().nullable(),
  images: z.array(z.string()),
  country: z.string().uuid().nullable().optional(),
  state: z.string().uuid().nullable().optional(),
  city: z.string().uuid().nullable().optional(),
});

export type DriverLibraryFormData = z.infer<typeof driverLibraryFormSchema>;

// ============================================
// RESTAURANT LIBRARY
// ============================================

export const restaurantLibraryFormSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  address: z.string().nullable().optional(),
  country: z.string().uuid().nullable().optional(),
  state: z.string().uuid().nullable().optional(),
  city: z.string().uuid().nullable().optional(),
  landline_number: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  poc_name: z.string().nullable().optional(),
  status: z.string().min(1, "Status is required"),
});

export type RestaurantLibraryFormData = z.infer<typeof restaurantLibraryFormSchema>;

// ============================================
// GUIDE LIBRARY
// ============================================

export const guideLibraryFormSchema = z.object({
  name: z.string().min(1, "Guide name is required"),
  gender: z.string().min(1, "Gender is required"),
  phone: z.string().min(1, "Phone number is required"),
  whatsapp_number: z.string().optional(),
  languages_known: z.array(z.string()).min(1, "At least one language is required"),
  status: z.string().min(1, "Status is required"),
  payroll_type: z.string().min(1, "Payroll type is required"),
  supplier_id: z.string().optional().nullable(),
  images: z.array(z.string()),
  country: z.string().uuid().nullable().optional(),
  state: z.string().uuid().nullable().optional(),
  city: z.string().uuid().nullable().optional(),
});

export type GuideLibraryFormData = z.infer<typeof guideLibraryFormSchema>;

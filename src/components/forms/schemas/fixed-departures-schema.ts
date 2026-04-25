import { z } from "zod";

export const AgeBandSchema = z
  .object({
    band_name: z.string().min(1),
    age_from: z.coerce.number().int().min(0),
    age_to: z.coerce.number().int().min(0),
    band_order: z.coerce.number().int().min(1),
  })
  .refine((b) => b.age_to > b.age_from, {
    message: "age_to must be greater than age_from",
    path: ["age_to"],
  });

export const FDGeneralInfoSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, "Package name is required"),
    tour_code: z.string().optional().nullable(),
    country_ids: z.array(z.string().uuid()).default([]),
    city_ids: z.array(z.string().uuid()).default([]),
    departure_city_id: z.string().uuid().nullable().optional(),
    duration_nights: z.coerce.number().int().min(1).default(7),
    max_group_size: z.coerce.number().int().min(0).nullable().optional(),
    currency: z.string().nullable().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
    age_restriction: z.boolean().default(false),
    min_age: z.coerce.number().int().min(0).nullable().optional(),
    max_age: z.coerce.number().int().min(0).nullable().optional(),
    banner_image_url: z.string().url("Must be a valid URL").or(z.literal("")).nullable().optional(),
    description: z.string().nullable().optional(),
    age_policies: z.array(AgeBandSchema).default([]),
  })
  .refine(
    (v) => {
      if (!v.age_restriction) return true;
      return v.min_age == null || v.max_age == null || v.max_age >= v.min_age;
    },
    { message: "max_age must be ≥ min_age", path: ["max_age"] },
  )
  .refine(
    (v) => {
      const bands = [...v.age_policies].sort((a, b) => a.band_order - b.band_order);
      for (let i = 1; i < bands.length; i++) {
        if (bands[i].age_from < bands[i - 1].age_to) return false;
      }
      return true;
    },
    { message: "Age bands overlap (each band's age_from must be ≥ prior band's age_to)", path: ["age_policies"] },
  );

export type IFDGeneralInfo = z.infer<typeof FDGeneralInfoSchema>;

export const FDItineraryDaySchema = z.object({
  day_number: z.coerce.number().int().min(1),
  title: z.string().default(""),
  description: z.string().nullable().optional().default(""),
  includes: z.string().nullable().optional().default(""),
  meals_included: z.array(z.string()).default([]),
  overnight_city_id: z.string().uuid().nullable().optional(),
  accommodation_note: z.string().nullable().optional().default(""),
  image_url: z
    .string()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .nullable()
    .optional(),
});

export const FDItinerarySchema = z.object({
  days: z.array(FDItineraryDaySchema),
});

export type IFDItineraryDay = z.infer<typeof FDItineraryDaySchema>;
export type IFDItinerary = z.infer<typeof FDItinerarySchema>;

export const FDAddonTypeSchema = z.enum(["day_tour", "multi_day_tour", "meal", "transfer", "other"]);
export type FDAddonTypeInput = z.infer<typeof FDAddonTypeSchema>;

export const FDAddonDaySchema = z.object({
  day_number: z.coerce.number().int().min(1),
  title: z.string().default(""),
  description: z.string().nullable().optional().default(""),
  includes: z.string().nullable().optional().default(""),
  meals_included: z.array(z.string()).default([]),
  overnight_city_id: z.string().uuid().nullable().optional(),
  accommodation_note: z.string().nullable().optional().default(""),
  image_url: z
    .string()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .nullable()
    .optional(),
});
export type IFDAddonDay = z.infer<typeof FDAddonDaySchema>;

export const FDAddonFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().nullable().optional().default(""),
    addon_type: FDAddonTypeSchema,
    is_mandatory: z.boolean().default(false),
    duration_days: z.coerce.number().int().min(1).nullable().optional(),
    price_unit: z.string().nullable().optional(),
    price_adult: z.coerce.number().min(0).nullable().optional(),
    price_child: z.coerce.number().min(0).nullable().optional(),
    price_infant: z.coerce.number().min(0).nullable().optional(),
    max_capacity: z.coerce.number().int().min(0).nullable().optional(),
    inclusions: z.array(z.string()).default([]),
    exclusions: z.array(z.string()).default([]),
    transfer_type: z.string().nullable().optional().default(""),
    transfer_mode: z.string().nullable().optional().default(""),
    tour_includes_transfer: z.boolean().default(false),
    tour_transfer_type: z.string().nullable().optional().default(""),
    days: z.array(FDAddonDaySchema).default([]),
  })
  .refine(
    (v) => v.addon_type !== "multi_day_tour" || (v.duration_days != null && v.duration_days >= 1),
    { message: "duration_days is required for multi-day tours", path: ["duration_days"] },
  );
export type IFDAddonForm = z.infer<typeof FDAddonFormSchema>;

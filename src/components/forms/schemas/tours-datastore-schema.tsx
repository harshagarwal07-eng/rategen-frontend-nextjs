import * as z from "zod";

// Age policy schema
const AgePolicySchema = z.object({
  infant: z
    .object({
      min_age: z.number(),
      max_age: z.number(),
      rates: z
        .object({
          ticket_only: z.coerce.number().optional(),
          sic: z.coerce.number().optional(),
          pvt: z.coerce.number().optional(),
        })
        .optional(),
    })
    .optional(),
  child: z
    .object({
      min_age: z.number(),
      max_age: z.number(),
      rates: z
        .object({
          ticket_only: z.coerce.number().optional(),
          sic: z.coerce.number().optional(),
          pvt: z.coerce.number().optional(),
        })
        .optional(),
    })
    .optional(),
  teenager: z
    .object({
      min_age: z.number(),
      max_age: z.number(),
      rates: z
        .object({
          ticket_only: z.coerce.number().optional(),
          sic: z.coerce.number().optional(),
          pvt: z.coerce.number().optional(),
        })
        .optional(),
    })
    .optional(),
  adult: z
    .object({
      min_age: z.number(),
      max_age: z.number(),
      rates: z
        .object({
          ticket_only: z.coerce.number().optional(),
          sic: z.coerce.number().optional(),
          pvt: z.coerce.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

// Operational hours schema
const OperationalHoursSchema = z.object({
  day: z.string(),
  time_start: z.string(),
  time_end: z.string(),
});

// Duration schema (JSONB)
const DurationSchema = z.object({
  days: z.coerce.number().optional(),
  hours: z.coerce.number().optional(),
  minutes: z.coerce.number().optional(),
});

// Season schema for tours
const TourSeasonSchema = z.object({
  dates: z.string().optional(), // Simple string like "All Season" or "Current - Oct 31"
  ticket_only_rate_adult: z.coerce.number().optional(),
  ticket_only_rate_child: z.coerce.number().optional(),
  ticket_only_rate_teenager: z.coerce.number().optional(),
  ticket_only_rate_infant: z.coerce.number().optional(),
  sic_rate_adult: z.coerce.number().optional(),
  sic_rate_child: z.coerce.number().optional(),
  sic_rate_teenager: z.coerce.number().optional(),
  sic_rate_infant: z.coerce.number().optional(),
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
  exception_rules: z.string().optional(), // Exception rules for the season
  order: z.number().optional(),
  blackout_dates: z.string().optional(), // Blackout dates for this season
  total_rate: z.coerce.number().optional(), // New "Total" rate field
});

// Package schema for tours
const TourPackageSchema = z.object({
  id: z.string().optional(),
  tour_id: z.string().optional(),
  name: z.string().min(1, "Package name is required"),
  description: z.string().optional(),
  remarks: z.string().optional(),
  child_policy: z.string().optional(), // Kept for backward compatibility
  preferred: z.boolean().default(false),
  iscombo: z.boolean().default(false),
  includes_transfer: z.boolean().optional(), // Whether transfer is included for this package
  order: z.number().optional(),
  selected_add_ons: z
    .array(
      z.union([
        z.string(),
        z.object({
          id: z.string(),
          is_mandatory: z.boolean().optional(),
        }),
      ])
    )
    .optional(),
  seasons: z.array(TourSeasonSchema).optional(),
  // New package-level fields
  notes: z.string().optional(), // For frontend and vouchers
  inclusions: z.string().optional(), // What's included
  exclusions: z.string().optional(), // What's excluded
  age_policy: AgePolicySchema.optional(), // Adult/Child/Infant age ranges and rates
  max_participants: z.coerce.number().optional(), // Maximum participants
  images: z.array(z.string()).optional(), // Package-specific images
  meeting_point: z.string().optional(), // Meeting point details
  pickup_point: z.string().optional(), // Pick-up point details
  dropoff_point: z.string().optional(), // Drop-off point details
  duration: DurationSchema.optional(), // JSONB: {days, hours, minutes}
  operational_hours: z.array(OperationalHoursSchema).optional(), // Array of day/time pairs
  categories: z.array(z.string()).optional(), // Package categories for classification
  tour_package_datastore_id: z.string().nullable().optional(),
  is_unlinked: z.boolean().optional(),
});

// Add-on schema for tours
const TourAddOnSchema = z.object({
  id: z.string().optional(),
  tour_id: z.string().optional(),
  name: z.string().min(1, "Add-on name is required"),
  description: z.string().optional(), // 1 line description
  is_mandatory: z.boolean().optional(), // Whether this add-on is mandatory
  age_policy: AgePolicySchema.optional(), // Same as packages: adult/child/infant age ranges
  remarks: z.string().optional(), // AI will refer to this
  notes: z.string().optional(), // For frontend and vouchers
  ticket_only_rate_adult: z.coerce.number().optional(),
  ticket_only_rate_child: z.coerce.number().optional(),
  ticket_only_rate_infant: z.coerce.number().optional(),
  ticket_only_rate_teenager: z.coerce.number().optional(),
  total_rate: z.coerce.number().optional(), // Total rate column
  max_participants: z.coerce.number().optional(), // Maximum participants
  images: z.array(z.string()).optional(),
  tour_add_on_datastore_id: z.string().nullable().optional(),
  is_unlinked: z.boolean().optional(),
});

export const ToursDatastoreSchema = z.object({
  id: z.string().optional(),
  tour_name: z.string().min(2, {
    message: "Tour name must be at least 2 characters.",
  }),
  ticket_only_rate_adult: z.number().optional(),
  ticket_only_rate_child: z.number().optional(),
  sic_rate_adult: z.number().optional(),
  sic_rate_child: z.number().optional(),
  raw_rates: z.string().optional(),
  description: z.string().optional(),
  remarks: z.string().optional(),
  cancellation_policy: z.string().optional(),
  child_policy: z.string().optional(),
  preferred: z.boolean().default(false),
  markup: z.string().optional(),
  currency: z.string().optional(),
  country: z.string().uuid().optional(),
  state: z.string().uuid().optional(),
  city: z.string().uuid().optional(),
  // Google Places fields for autofill
  formatted_address: z.string().optional(),
  website: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  rating: z.number().optional(),
  user_ratings_total: z.number().optional(),
  photos: z.record(z.any()).optional(), // Changed from types to photos as JSONB
  types: z.array(z.string()).optional(),
  review_summary: z.string().optional(),
  maps_url: z.string().optional(),
  place_id: z.string().optional(),
  images: z.array(z.string()).optional(), // Tour images
  timings: z.array(z.string()).optional(),
  pvt_rate: z.record(z.string(), z.number()).optional(), // JSONB field
  examples: z.string().optional(),
  // New tour-level fields
  notes: z.string().optional(), // For frontend and vouchers
  packages: z.array(TourPackageSchema).optional(), // Packages array with seasons
  add_ons: z.array(TourAddOnSchema).optional(), // Tour add-ons
  tour_datastore_id: z.string().nullable().optional(),
  is_unlinked: z.boolean(),
});

export type IAgePolicy = z.infer<typeof AgePolicySchema>;
export type IOperationalHours = z.infer<typeof OperationalHoursSchema>;
export type ITourSeason = z.infer<typeof TourSeasonSchema>;
export type ITourPackage = z.infer<typeof TourPackageSchema>;
export type ITourAddOn = z.infer<typeof TourAddOnSchema>;
export type IToursDatastore = z.infer<typeof ToursDatastoreSchema>;

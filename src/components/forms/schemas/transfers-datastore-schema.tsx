import * as z from "zod";

// Transfer type enum values
export const TransferTypeEnum = z.enum([
  // Airport/Port/Station Transfers
  "airport_to_hotel",
  "hotel_to_airport",
  "port_to_hotel",
  "hotel_to_port",
  "station_to_hotel",
  "hotel_to_station",
  // Tour Transfers
  "hotel_to_tour",
  "tour_to_hotel",
  "tour_to_tour",
  // Inter-City/Hotel Transfers
  "inter_city",
  "hotel_to_hotel",
]);

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

// Age bracket schema
const AgeBracketSchema = z.object({
  min_age: z.coerce.number().optional(),
  max_age: z.coerce.number().optional(),
});

// Age policy schema
const AgePolicySchema = z.object({
  adult: AgeBracketSchema.optional(),
  teenager: AgeBracketSchema.optional(),
  child: AgeBracketSchema.optional(),
  infant: AgeBracketSchema.optional(),
});

// Season schema for transfers
const SeasonSchema = z.object({
  dates: z.string().optional(), // Simple string like "All Season" or "Current - Oct 31"
  sic_rate_adult: z.coerce.number().optional(),
  sic_rate_child: z.coerce.number().optional(),
  sic_max_luggage: z.coerce.number().optional(),
  sic_max_passengers: z.coerce.number().optional(),
  pvt_rate: z.record(z.string(), z.coerce.number()).optional(),
  // Km Based Rates (for Vehicle On Disposal mode)
  km_rate_per_km: z.coerce.number().optional(),
  km_min_per_day: z.coerce.number().optional(),
  km_max_hrs_per_day: z.coerce.number().optional(),
  km_surcharge_per_hr: z.coerce.number().optional(),
  per_vehicle_rate: z
    .array(
      z.object({
        rate: z.coerce.number().optional(),
        brand: z.string().optional(),
        vehicle_type: z.string().optional(),
        max_passengers: z.coerce.number().optional(),
        max_luggage: z.coerce.number().optional(),
        // Vehicle On Disposal fields
        max_hrs_day: z.coerce.number().optional(),
        max_kms_day: z.coerce.number().optional(),
        surcharge_hr: z.coerce.number().optional(),
        surcharge_km: z.coerce.number().optional(),
        extras: z.string().optional(),
      })
    )
    .optional(),
  exception_rules: z.string().optional(),
  order: z.number().optional(),
  blackout_dates: z.string().optional(),
});

// Package schema for transfers
const TransferPackageSchema = z.object({
  id: z.string().optional(),
  transfer_id: z.string().optional(),
  name: z.string().min(1, "Package name is required"),
  description: z.string().optional(),
  remarks: z.string().optional(), // AI Remarks
  notes: z.string().optional(), // For frontend and vouchers
  inclusions: z.string().optional(),
  exclusions: z.string().optional(),
  preferred: z.boolean().default(false),
  iscombo: z.boolean().default(false),
  order: z.number().optional(),
  // Route Details
  origin: z.string().optional(),
  destination: z.string().optional(),
  num_stops: z.coerce.number().optional(),
  via: z.string().optional(),
  duration: DurationSchema.optional(),
  // Location Points
  meeting_point: z.string().optional(),
  pickup_point: z.string().optional(),
  dropoff_point: z.string().optional(),
  // Other
  images: z.array(z.string()).optional(),
  operational_hours: z.array(OperationalHoursSchema).optional(),
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
  seasons: z.array(SeasonSchema).optional(),
  // Transfer type (multiselect)
  transfer_type: z.array(TransferTypeEnum).optional(),
  transfer_package_datastore_id: z.string().nullable().optional(),
  is_unlinked: z.boolean().optional(),
});

// Add-on schema for transfers
const TransferAddOnSchema = z.object({
  id: z.string().optional(),
  transfer_id: z.string().optional(),
  name: z.string().min(1, "Add-on name is required"),
  description: z.string().optional(),
  is_mandatory: z.boolean().optional(),
  age_policy: AgePolicySchema.optional(),
  remarks: z.string().optional(),
  notes: z.string().optional(),
  rate_adult: z.coerce.number().optional(),
  rate_child: z.coerce.number().optional(),
  rate_teenager: z.coerce.number().optional(),
  rate_infant: z.coerce.number().optional(),
  total_rate: z.coerce.number().optional(),
  max_participants: z.coerce.number().optional(),
  images: z.array(z.string()).optional(),
  transfer_add_on_datastore_id: z.string().nullable().optional(),
  is_unlinked: z.boolean().optional(),
});

export const TransfersDatastoreSchema = z.object({
  id: z.string().optional(),
  transfer_name: z.string().optional(),
  description: z.string().optional(),
  mode: z.string().optional(),
  preferred: z.boolean().default(false),
  markup: z.number().optional(),
  rule: z.string().optional(),
  raw_rates: z.string().optional(),
  cancellation_policy: z.string().optional(),
  remarks: z.string().optional(), // AI Remarks
  currency: z.string().optional(),
  country: z.string().uuid().optional(),
  city: z.string().uuid().optional(),
  images: z.array(z.string()).optional(),
  examples: z.string().optional(),
  packages: z.array(TransferPackageSchema).optional(),
  add_ons: z.array(TransferAddOnSchema).optional(),
  transfer_datastore_id: z.string().nullable().optional(),
  is_unlinked: z.boolean().optional(),
});

export type IAgePolicy = z.infer<typeof AgePolicySchema>;
export type IOperationalHours = z.infer<typeof OperationalHoursSchema>;
export type ISeason = z.infer<typeof SeasonSchema>;
export type ITransferPackage = z.infer<typeof TransferPackageSchema>;
export type ITransferAddOn = z.infer<typeof TransferAddOnSchema>;
export type ITransfersDatastore = z.infer<typeof TransfersDatastoreSchema>;

import * as z from "zod";

const BookingOfferSchema = z.object({
  offer_dates: z.string().optional(),
  rate_per_night: z.number().min(0, "Rate per night must be positive").nullable().optional(),
  single_pp: z.number().min(0, "Single per pax must be positive").nullable().optional(),
  double_pp: z.number().min(0, "Double per pax must be positive").nullable().optional(),
  extra_bed_pp: z.number().min(0, "Extra bed per pax must be positive").nullable().optional(),
  child_no_bed: z.number().min(0, "Child no bed must be positive").nullable().optional(),
});

const SeasonSchema = z.object({
  dates: z.string().min(1, "Season dates are required"),
  rate_per_night: z.number().min(0, "Rate per night must be positive").nullable().optional(),
  single_pp: z.number().min(0, "Single per pax must be positive").nullable().optional(),
  double_pp: z.number().min(0, "Double per pax must be positive").nullable().optional(),
  extra_bed_pp: z.number().min(0, "Extra bed per pax must be positive").nullable().optional(),
  child_no_bed: z.number().min(0, "Child no bed must be positive").nullable().optional(),
  booking_offers: z.array(BookingOfferSchema).optional(),
});

const HotelRoomSchema = z.object({
  id: z.string().optional(),
  room_category: z.string().min(1, "Room category is required."),
  max_occupancy: z.string().optional(),
  meal_plan: z.string().optional(),
  other_details: z.string().optional().nullable(),
  extra_bed_policy: z.string().optional().nullable(),
  stop_sale: z.string().optional().nullable(),
  sort_order: z.number().optional(),
  seasons: z.array(SeasonSchema).min(1, "At least one season is required"),
  hotel_room_datastore_id: z.string().nullable().optional(),
  is_unlinked: z.boolean().optional(),
});

// General Info Schema
export const HotelGeneralInfoSchema = z.object({
  id: z.string().optional(),
  hotel_name: z.string().min(2, { message: "Hotel name must be at least 2 characters." }),
  hotel_code: z.string().optional(),
  hotel_address: z.string().optional(),
  hotel_city: z.string().uuid({ message: "City is required" }),
  hotel_state: z.string().optional(),
  hotel_country: z.string().uuid({ message: "Country is required" }),
  hotel_phone: z.string().optional(),
  hotel_email: z.string().email("Invalid email format").optional().or(z.literal("")),
  hotel_description: z.string().optional(),
  hotel_currency: z.string().optional(),
  property_type: z.string().optional(),
  star_rating: z.string().optional(),
  preferred: z.boolean().default(false),
  markup: z.number().optional(),
  examples: z.string().optional(),
  offers: z.string().optional(),
});

// Policies Schema
export const HotelPoliciesSchema = z.object({
  id: z.string().optional(),
  cancellation_policy: z.string().optional(),
  payment_policy: z.string().optional(),
  group_policy: z.string().optional(),
  remarks: z.string().optional(),
});

// Rooms Schema
export const HotelRoomsSchema = z.object({
  id: z.string().optional(),
  rooms: z.array(HotelRoomSchema).min(1, "At least one room is required"),
});

const AgePolicySchema = z.object({
  meals: z.object({ to: z.number(), from: z.number() }).optional(),
  rooms: z.object({ to: z.number(), from: z.number() }).optional(),
});

const MealPlanRateSchema = z.object({
  meal_type: z.string(),
  rates: z.object({
    adult: z.number(),
    teenager: z.number(),
    child: z.number(),
    infant: z.number(),
  }),
});

// Combined Schema
export const HotelsDatastoreSchema = z.object({
  id: z.string().optional(),
  // General Info
  hotel_name: z.string().min(2, { message: "Hotel name must be at least 2 characters." }),
  hotel_code: z.string().optional(),
  hotel_address: z.string().optional(),
  hotel_city: z.string().uuid({ message: "City is required" }),
  hotel_country: z.string().uuid({ message: "Country is required" }),
  hotel_phone: z.string().optional(),
  hotel_email: z.string().email("Invalid email format").optional().or(z.literal("")),
  hotel_description: z.string().optional(),
  hotel_currency: z.string().optional(),
  property_type: z.string().optional(),
  star_rating: z.string().optional(),
  preferred: z.boolean().default(false),
  markup: z.number().optional(),
  examples: z.string().optional(),
  offers: z.string().optional(),
  // Policies
  cancellation_policy: z.string().optional(),
  payment_policy: z.string().optional(),
  group_policy: z.string().optional(),
  remarks: z.string().optional(),
  age_policy: z.object({
    adult: AgePolicySchema,
    teenager: AgePolicySchema,
    child: AgePolicySchema,
    infant: AgePolicySchema,
  }),
  meal_plan_rates: z.array(MealPlanRateSchema),
  // Rooms
  rooms: z.array(HotelRoomSchema).optional(),
  hotel_datastore_id: z.string().nullable().optional(),
  is_unlinked: z.boolean().optional(),
});

export type IBookingOffer = z.infer<typeof BookingOfferSchema>;
export type ISeason = z.infer<typeof SeasonSchema>;
export type IHotelRoom = z.infer<typeof HotelRoomSchema>;
export type IHotelGeneralInfo = z.infer<typeof HotelGeneralInfoSchema>;
export type IHotelPolicies = z.infer<typeof HotelPoliciesSchema>;
export type IHotelRooms = z.infer<typeof HotelRoomsSchema>;
export type IHotelsDatastore = z.infer<typeof HotelsDatastoreSchema>;

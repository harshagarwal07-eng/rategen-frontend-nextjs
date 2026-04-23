import { z } from "zod";

// Common booking fields shared across all service types
export const baseBookingSchema = z.object({
  title: z.string().optional(),
  supplier_id: z.string().optional(),
  confirmation_no: z.string().optional(),
  notes: z.string().optional(),
  booking_status: z.string().optional(),
  voucher_status: z.string().optional(),
  free_cancellation_date: z.string().optional(),
  free_cancellation_time: z.string().optional(),
  reconfirmed_by: z.string().optional(),
  currency: z.string().optional(),
  cost_price: z.number().optional(),
});

export const hotelBookingFields = z.object({
  check_in_date: z.string().min(1, "Check-in date is required"),
  check_in_time: z.string().optional(),
  check_out_date: z.string().min(1, "Check-out date is required"),
  check_out_time: z.string().optional(),
  early_checkin: z.boolean().optional(),
  late_checkout: z.boolean().optional(),

  number_of_rooms: z.number().optional(),
  rooms: z
    .array(
      z.object({
        room_category: z.string().min(1, "Room category is required"),
        quantity: z.number().min(1),
      })
    )
    .min(1, "At least one room is required"),
  room_pax_distribution: z
    .array(
      z.object({
        room_number: z.number(),
        adults: z.number(),
        teens: z.number(),
        children: z.number(),
        infants: z.number(),
        children_ages: z.array(z.number()).optional(),
      })
    )
    .optional(),

  meal_plan: z.string().optional(),
  meal_complimentary: z.boolean().optional(),
  remarks: z.string().optional(),
});
export const hotelBookingSchema = baseBookingSchema.merge(hotelBookingFields);

export const tourBookingFields = z.object({
  tour_start_date: z.string().min(1, "Start date is required"),
  tour_start_time: z.string().optional(),
  tour_end_date: z.string().optional(),
  tour_end_time: z.string().optional(),

  duration_days: z.number().optional(),
  duration_hours: z.number().optional(),
  duration_minutes: z.number().optional(),

  // Tour type: ticket_only, sic_transfers, pvt_transfers
  tour_type: z.string().optional(),

  // Transfer fields (conditional - shown when tour_type includes transfers)
  transfer_mode: z.string().optional(),
  transfer_type: z.string().optional(),
  vehicle_type: z.string().optional(),
  no_of_vehicles: z.number().optional(),
  vehicle_id: z.string().optional(),
  driver_id: z.string().optional(),

  pickup_date: z.string().optional(),
  pickup_time: z.string().optional(),
  pickup_point: z.string().optional(),
  drop_date: z.string().optional(),
  drop_time: z.string().optional(),
  drop_point: z.string().optional(),

  // Inclusions & Exclusions (auto-filled from service details)
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
});

export const tourBookingSchema = baseBookingSchema.merge(tourBookingFields);

export const transferBookingFields = z.object({
  transfer_type: z.string().optional(),
  transfer_mode: z.string().min(1, "Transfer mode is required"),

  vehicle_id: z.string().optional(),
  driver_id: z.string().optional(),

  pickup_date: z.string().min(1, "Pickup date is required"),
  pickup_time: z.string().optional(),
  pickup_point: z.string().optional(),
  drop_date: z.string().optional(),
  drop_time: z.string().optional(),
  drop_point: z.string().optional(),

  meeting_point: z.string().optional(),
  welcome_placard: z.string().optional(),

  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
});

export const transferBookingSchema = baseBookingSchema.merge(transferBookingFields).refine(
  (data) => {
    const requiresVehicle = data.transfer_mode === "vehicle" || data.transfer_mode === "vehicle_on_disposal";
    if (requiresVehicle) {
      return !!data.vehicle_id;
    }
    return true;
  },
  {
    message: "Vehicle selection is required for Vehicle and Vehicle on Disposal transfers",
    path: ["vehicle_id"],
  }
);

export type BaseBookingFormData = z.infer<typeof baseBookingSchema>;
export type HotelBookingFormData = z.infer<typeof hotelBookingSchema>;
export type TourBookingFormData = z.infer<typeof tourBookingSchema>;
export type TransferBookingFormData = z.infer<typeof transferBookingSchema>;

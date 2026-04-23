import * as z from "zod";

const guestSchema = z.array(
  z.object({
    type: z.enum(["adult", "child"], {
      message: "Invalid guest type",
    }),
    pan: z
      .string()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, {
        message: "Invalid PAN number format",
      })
      .optional(),
    title: z.string().min(1, "Title is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    age: z.number().min(1, "Age is required").optional(),
    email: z.string().email({ message: "Invalid email format" }).optional(),
  })
);

const tripDetailsSchema = z.object({
  arrival_mode: z.enum(["flight", "surface"], {
    message: "Arrival mode is required",
  }),
  arrival_flight: z.string().optional(),
  arrival_date: z.date({
    message: "Pick-up date is required.",
  }),
  arrival_time: z.string({
    message: "Pick-up time is required.",
  }),
  departure_mode: z.enum(["flight", "surface"], {
    message: "Departure mode is required",
  }),
  departure_flight: z.string().optional(),
  departure_date: z.date({
    message: "Pick-up date is required.",
  }),
  departure_time: z.string({
    message: "Pick-up time is required.",
  }),
});

const travelDetailsSchema = z.object({
  vehicals_no: z.number().min(1, "Vehicle number is required"),
  baggage_no: z.number().min(1, "Baggage number is required"),
  pick_up: z.string().min(1, "Pink up destination is required"),
  pick_up_date: z.date({
    message: "Pick-up date is required.",
  }),
  pick_up_time: z.string({
    message: "Pick-up time is required.",
  }),
  drop_of: z.string().min(1, "Drop of destination is required"),
  departure_date: z.date({
    message: "Drop-of date is required.",
  }),
  departure_time: z.string({
    message: "Drop-of time is required.",
  }),
});

// Form validation schema based on category
export const HotelBookingSchema = z.object({
  guests: guestSchema,
  ...tripDetailsSchema.shape,
  special_requests: z.string().optional(),
  remarks: z.string().optional(),
  payment_method: z.enum(["pay-later", "pay-by-card", "pay-by-credit-limit"]),
});

export const TransferBookingSchema = z.object({
  guests: guestSchema,
  ...travelDetailsSchema.shape,
  special_requests: z.string().optional(),
  remarks: z.string().optional(),
  greeting_sign: z.string().min(1, "Greeting sign is required"),
  payment_method: z.enum(["pay-later", "pay-by-card", "pay-by-credit-limit"]),
});

export const TourBookingSchema = z.object({
  guests: guestSchema,
  special_requests: z.string().optional(),
  payment_method: z.enum(["pay-later", "pay-by-card", "pay-by-credit-limit"]),
});

export type IHotelBookingForm = z.infer<typeof HotelBookingSchema>;
export type ITransferBookingForm = z.infer<typeof TransferBookingSchema>;
export type ITourBookingForm = z.infer<typeof TourBookingSchema>;

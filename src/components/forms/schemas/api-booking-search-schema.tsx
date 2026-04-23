import * as z from "zod";

export const HotelSearchSchema = z.object({
  country: z.string().min(2, { message: "Select a Country" }),
  city: z.string().min(2, { message: "Select a City" }),
  checkIn: z.date({
    message: "Check-in date is required.",
  }),

  checkOut: z.date({
    message: "Check-out date is required.",
  }),

  guests: z.array(
    z.object({
      adults: z.number({ message: "Number of adults is required." }),
      children: z.number(),
      children_ages: z.array(z.number()).optional(),
    })
  ),

  rating: z.string().optional(),
  accommodation_type: z.string().optional(),
});

export const TransferSearchSchema = z.object({
  transfer_type: z.enum(["one-way", "round-trip"], {
    message: "Please select a transfer type.",
  }),

  pick_up_location: z
    .string()
    .min(1, { message: "Pick-up location is required." }),

  drop_of_location: z
    .string()
    .min(1, { message: "Drop-off location is required." }),

  departure_date: z.date({
    message: "Departure date is required.",
  }),

  departure_pick_up_time: z.date({
    message: "Pick-up time is required.",
  }),

  return_date: z
    .date({
      message: "Invalid return date format.",
    })
    .optional(),

  return_pick_up_time: z
    .date({
      message: "Invalid return pick-up time format.",
    })
    .optional(),

  passenger: z.object({
    adults: z.number({ message: "Number of adults is required." }),
    children: z.number(),
    infants: z.number(),
  }),
});

export const TourSearchSchema = z.object({
  destination: z.string().min(2, { message: "Select a destination name" }),
});

export type IHotelSearchForm = z.infer<typeof HotelSearchSchema>;
export type ITransferSearchForm = z.infer<typeof TransferSearchSchema>;
export type ITourSearchForm = z.infer<typeof TourSearchSchema>;

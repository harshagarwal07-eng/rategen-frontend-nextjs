import { z } from "zod";

const PassengerTypeSchema = z.enum(["adult", "child", "infant"]);
const TitleSchema = z.enum(["Mr", "Mrs", "Ms", "Dr", "Master"]);
const GenderSchema = z.enum(["male", "female", "other"]);
const FlightTypeSchema = z.enum(["arrival", "departure", "internal"]);

const BaseGuestSchema = z.object({
  guest_id: z.string().optional(), // tracks travel_agent_guest_details row id; "temp-guest-N" = unsaved new guest
  type: PassengerTypeSchema,
  title: TitleSchema,
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  gender: GenderSchema,
  date_of_birth: z.string().min(1, "Date of birth is required"),
  nationality: z.string().min(1, "Nationality is required"),
  nationality_name: z.string().optional(), // Store country name for display
  passport_number: z.string().min(1, "Passport number is required"),
  passport_issue_date: z.string().min(1, "Passport issue date is required"),
  passport_expiry: z.string().min(1, "Passport expiry is required"),
  room_assignment: z.number().optional(),

  dietary_preference: z.string().optional(),
  dietary_custom: z.string().optional(),
  food_allergies: z.string().optional(),
  medical_restrictions: z.string().optional(),
  bed_type: z.string().optional(),
  smoking: z.boolean().optional(),
  medical_conditions: z.string().optional(),
  mobility_assistance: z.string().optional(),
});

export const LeadGuestSchema = BaseGuestSchema.extend({
  contact_mobile: z
    .string()
    .min(1, "Contact mobile is required for lead guest"),
});

export const PassengerSchema = BaseGuestSchema.extend({
  contact_mobile: z.string().optional(),
});

export const GuestDetailsFormSchema = z.object({
  lead_guest: LeadGuestSchema,
  passengers: z.array(PassengerSchema),
});

export const ArrivalDepartureSchema = z.object({
  type: FlightTypeSchema,
  from: z.string().min(1, "From location is required"),
  to: z.string().min(1, "To location is required"),
  arrival_date: z.string().min(1, "Arrival date is required"),
  arrival_time: z.string().min(1, "Arrival time is required"),
  dept_date: z.string().min(1, "Departure date is required"),
  dept_time: z.string().min(1, "Departure time is required"),
  airline: z.string().min(1, "Airline is required"),
  flight_no: z.string().min(1, "Flight number is required"),
  passenger_ids: z.array(z.string()).optional(),
});

export const ArrivalDepartureFormSchema = z.object({
  arrivals: z.array(ArrivalDepartureSchema).optional(),
  departures: z.array(ArrivalDepartureSchema).optional(),
  internal_flights: z.array(ArrivalDepartureSchema).optional(),
});

export const PreferencesSchema = z.object({
  interconnecting_rooms: z.boolean().optional(),
  special_room_requests: z.string().optional(),

  luggage_checkin: z.number().optional(),
  luggage_cabin: z.number().optional(),
  oversized_luggage: z.boolean().optional(),
  child_seat_required: z.boolean().optional(),
  child_seat_count: z.number().optional(),

  honeymoon: z.boolean().optional(),
  anniversary: z.boolean().optional(),
  birthday: z.boolean().optional(),
  other_requests: z.string().optional(),
});

export const DocumentFileSchema = z.object({
  url: z.string().min(1, "URL is required"),
  name: z.string().min(1, "File name is required"),
  type: z.string().min(1, "File type is required"),
  category: z.string().optional(),
  passenger_id: z.string().optional(),
  notes: z.string().optional(),
});

export const DocumentsFormSchema = z.object({
  documents: z.array(DocumentFileSchema),
});

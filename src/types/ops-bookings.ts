import type {
  ItineraryActivity,
  HotelActivity,
  TourActivity,
  TransferActivity,
  ServiceType,
} from "@/data-access/itinerary-activities";
import { PaymentPlanStatus } from "./ops-accounts";
import { SearchParams } from "./common";
import type { ISupplierTeamMemberData } from "./suppliers";

export type BookingPoc = ISupplierTeamMemberData & { is_primary: boolean };

export type BookingStatus = "pending" | "on_hold" | "confirmed";
export type VoucherStatus = "pending" | "vouchered";

export interface OpsBooking {
  id: string;
  created_at: string;
  updated_at: string;

  query_id: string;
  itinerary_id: string; // FK to itinerary_activities (source of truth for service details)

  supplier_id: string | null;
  supplier_item_id: string | null;
  booking_status: BookingStatus;
  payment_status: PaymentPlanStatus;
  voucher_status: VoucherStatus;
  confirmation_no: string | null;

  vehicle_id: string | null;
  driver_id: string | null;
  restaurant_id: string | null;
  guide_id: string | null;

  meeting_point: string | null;
  welcome_placard: string | null;

  title: string | null;
  notes: string | null;
  reconfirmed_by: string | null;
  cost_price: number;
  currency: string | null;

  // Supplier POC
  poc: BookingPoc[] | null;

  // Vehicle info
  vehicle_brand: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  vehicle_category: string | null;

  // Driver info
  driver_name: string | null;
  driver_phone: string | null;
  driver_whatsapp: string | null;

  // Restaurant info
  restaurant_name: string | null;
  restaurant_phone: string | null;
  restaurant_poc_name: string | null;

  // Guide info
  guide_name: string | null;
  guide_phone: string | null;
  guide_whatsapp: string | null;
}

// Booking with activity details - data comes flat from vw_whitelabel_booking_details
export interface BookingWithActivity extends OpsBooking {
  activity?: ItineraryActivity; // only present when loaded with join, not from view
  supplier_name?: string | null;

  // Query / traveler info (from view)
  short_query_id?: string | null;
  traveler_name?: string | null;
  pax_details?: { adults?: number; children?: number; children_ages?: number[] } | null;
  agency_name?: string | null;
  agency_admin_name?: string | null;
  agency_admin_email?: string | null;
  agency_admin_phone?: string | null;
  dmc_id?: string | null;

  // Service info (from view)
  service_type?: string | null;
  service_name?: string | null;
  service_country?: string | null;
  service_city?: string | null;
  day_number?: number | null;
  option_number?: number | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  tour_date?: string | null;
  pickup_date?: string | null;
  drop_date?: string | null;

  // Booking detail fields (from view)
  free_cancellation_date?: string | null;
  free_cancellation_time?: string | null;

  // Payment plan (from view)
  payment_plan_id?: string | null;
  payment_total_amount?: number | null;
  payment_paid_amount?: number | null;
  payment_remaining_amount?: number | null;
  payment_due_date?: string | null;
  payment_plan_active?: boolean | null;
  derived_payment_status?: string | null;
}

export interface HotelBookingWithActivity extends OpsBooking {
  activity: HotelActivity;
}

export interface TourBookingWithActivity extends OpsBooking {
  activity: TourActivity;
}

export interface TransferBookingWithActivity extends OpsBooking {
  activity: TransferActivity;
}

export interface BookingInput {
  query_id?: string;
  itinerary_id?: string;
  supplier_id?: string | null;
  supplier_item_id?: string | null;
  booking_status?: BookingStatus;
  payment_status?: PaymentPlanStatus;
  voucher_status?: VoucherStatus;
  confirmation_no?: string | null;
  vehicle_id?: string | null;
  driver_id?: string | null;
  restaurant_id?: string | null;
  guide_id?: string | null;
  meeting_point?: string | null;
  welcome_placard?: string | null;
  title?: string | null;
  notes?: string | null;
  reconfirmed_by?: string | null;
  cost_price?: number;
  currency?: string | null;
  supplier_notes?: string | null;
  payment_plan_id?: string | null;
}

export type CreateBookingInput = BookingInput & {
  query_id: string;
  itinerary_id: string;
};

export type UpdateBookingInput = Partial<BookingInput>;

export interface BookingFormOverrides {
  booking_status?: BookingStatus;
  payment_status?: PaymentPlanStatus;
  voucher_status?: VoucherStatus;
  confirmation_no?: string;
  reconfirmed_by?: string;
  vehicle_id?: string;
  driver_id?: string;
  supplier_id?: string;
  supplier_item_id?: string;
  cost_price?: number;
  currency?: string;
  notes?: string;
}

// Lightweight type for dropdown display - only essential fields
export interface ActivityDropdownItem {
  id: string;
  service_type: "hotel" | "tour" | "transfer";
  day_number: number;
  hotel_name?: string | null;
  tour_name?: string | null;
  transfer_name?: string | null;
  check_in_date?: string | null;
  tour_date?: string | null;
  pickup_date?: string | null;
}

// Booking table row display type
export interface BookingTableRow {
  id: string;
  itinerary_id: string;
  service_name: string;
  service_type: ServiceType;
  start_date: string;
  end_date: string;
  amount: number;
  currency: string;
  booking_status: BookingStatus;
  payment_status: PaymentPlanStatus;
  voucher_status: VoucherStatus;
  supplier_name?: string | null;
  option_number?: number | null;
}

// Extended booking for calendar view with query info
export interface CalendarBooking extends BookingTableRow {
  short_query_id: string; // e.g., "2264442"
  traveler_name: string; // Lead pax name
  day_number: number; // Day 1, Day 2, etc.
  check_in_date?: string | null;
  check_out_date?: string | null;
  tour_date?: string | null;
  pickup_date?: string | null;
  drop_date?: string | null;

  // Query/traveler info
  pax_details?: { adults?: number; children?: number; children_ages?: number[] } | null;
  agency_name?: string | null;
  agency_admin_name?: string | null;
  agency_admin_email?: string | null;
  agency_admin_phone?: string | null;
  dmc_id?: string | null;

  // Service location
  service_country?: string | null;
  service_city?: string | null;

  // Booking detail fields
  confirmation_no?: string | null;
  reconfirmed_by?: string | null;
  notes?: string | null;
  meeting_point?: string | null;
  welcome_placard?: string | null;
  free_cancellation_date?: string | null;
  free_cancellation_time?: string | null;

  // Supplier
  supplier_id?: string | null;
  supplier_item_id?: string | null;
  cost_price?: number | null;

  // POC
  poc?: BookingPoc[] | null;

  // Library: Vehicle
  vehicle_brand?: string | null;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  vehicle_category?: string | null;

  // Library: Driver
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_whatsapp?: string | null;

  // Library: Restaurant
  restaurant_name?: string | null;
  restaurant_phone?: string | null;
  restaurant_poc_name?: string | null;

  // Library: Guide
  guide_name?: string | null;
  guide_phone?: string | null;
  guide_whatsapp?: string | null;

  // Payment plan
  payment_plan_id?: string | null;
  payment_total_amount?: number | null;
  payment_paid_amount?: number | null;
  payment_remaining_amount?: number | null;
  payment_due_date?: string | null;
  payment_plan_active?: boolean | null;
  derived_payment_status?: string | null;
}

// Calendar day structure
export interface CalendarDay {
  date: Date;
  bookings: CalendarBooking[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
}

// View type for bookings page
export type BookingsViewType = "calendar" | "table";

// =====================================================
// Generic Booking + Supplier Service + Payment Types
// =====================================================

export interface PaymentInstallment {
  id?: string;
  amount: number;
  due_date: string;
}

export interface UpsertBookingWithSupplierInput {
  activityId: string;
  activityUpdates: Record<string, any>;
  bookingId?: string | null;
  queryId?: string;
  bookingUpdates?: Record<string, any>;
  supplierId?: string;
  supplierItemId?: string;
  costPrice?: number;
  supplierNotes?: string;
  updatePaymentSchedule?: boolean;
  fullPaymentDueDate?: string;
  installments?: PaymentInstallment[];
}

export interface UpsertBookingWithSupplierResponse {
  success: boolean;
  service_type: string;
  activity_id: string;
  booking_id: string;
  supplier_changed: boolean;
  cost_changed: boolean;
  payment_updated: boolean;
}

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

// Grouped bookings by query for calendar card
export interface QueryDayBooking {
  queryId: string;
  shortQueryId: string;
  travelerName: string;
  dayNumber: number;
  bookings: CalendarBooking[];
}

// Search params for bookings page
export interface BookingsSearchParams extends SearchParams {
  view: "table" | "grid" | "calendar";
  booking_status: string[];
  voucher_status: string[];
  payment_status: string[];
  service_type: string[];
  supplier: string[];
  country: string[];
  city: string[];
  agency: string[];
  search?: string;
  start_date?: string | null; // YYYY-MM-DD format
  end_date?: string | null; // YYYY-MM-DD format
}

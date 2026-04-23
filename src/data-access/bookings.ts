"use server";

import { createClient } from "@/utils/supabase/server";
import { updateActivity, type HotelActivity, type TourActivity, type TransferActivity } from "./itinerary-activities";
import type { ServiceBreakup } from "./service-breakups";
import { createBreakupsBulk, updateServiceBreakup } from "./service-breakups";
import { isTempBreakup } from "@/lib/pricing/breakup-utils";
import {
  BookingStatus,
  VoucherStatus,
  OpsBooking,
  BookingWithActivity,
  UpdateBookingInput,
  BookingInput,
  ActivityDropdownItem,
} from "@/types/ops-bookings";
import { getCurrentUser } from "./auth";
import type { IOption } from "@/types/common";

export async function getQueryBookingsWithActivities(
  queryId?: string,
  params?: {
    booking_status?: string[];
    voucher_status?: string[];
    payment_status?: string[];
    service_type?: string[];
    supplier?: string[];
    country?: string[];
    city?: string[];
    agency?: string[];
    search?: string;
    start_date?: string;
    end_date?: string;
    sort?: Array<{ id: string; desc: boolean }>;
    page?: number;
    perPage?: number;
  }
): Promise<{ data: BookingWithActivity[]; totalItems: number }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], totalItems: 0 };

  const {
    booking_status,
    voucher_status,
    payment_status,
    service_type,
    supplier,
    country,
    city,
    agency,
    search,
    start_date,
    end_date,
    sort,
    page = 1,
    perPage = 100,
  } = params || {};

  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  // Map column ids (from table) to actual view column names
  const sortColumnMap: Record<string, string> = {
    query_id: "short_query_id",
    service: "service_name",
    lead_pax: "traveler_name",
    service_type: "service_type",
    supplier: "supplier_name",
    booking_status: "booking_status",
    payment_status: "derived_payment_status",
    voucher_status: "voucher_status",
    country: "service_country",
    city: "service_city",
  };
  const sortColumnId = sort?.[0]?.id;
  const sortColumn =
    sortColumnId === "start_date" || !sortColumnId
      ? "start_date"
      : (sortColumnMap[sortColumnId] ?? sortColumnId);
  const ascending = !(sort?.[0]?.desc ?? false);

  let query = supabase
    .from("vw_whitelabel_booking_details")
    .select("*, id:booking_id,notes:booking_notes", { count: "exact" })
    .eq("dmc_id", user.dmc.id)
    .order(sortColumn, { ascending, nullsFirst: false });

  query = query.range(start, end);

  if (queryId) {
    query = query.eq("query_id", queryId);
  }

  if (booking_status && booking_status.length > 0) {
    query = query.in("booking_status", booking_status);
  }

  if (voucher_status && voucher_status.length > 0) {
    query = query.in("voucher_status", voucher_status);
  }

  if (payment_status && payment_status.length > 0) {
    const hasNotConfigured = payment_status.includes("not_configured");
    const dbStatuses = payment_status.filter((s) => s !== "not_configured");

    if (hasNotConfigured && dbStatuses.length > 0) {
      query = query.or(`derived_payment_status.is.null,derived_payment_status.in.(${dbStatuses.join(",")})`);
    } else if (hasNotConfigured) {
      query = query.is("derived_payment_status", null);
    } else if (dbStatuses.length > 0) {
      query = query.in("derived_payment_status", dbStatuses);
    }
  }

  if (service_type && service_type.length > 0) {
    query = query.in("service_type", service_type);
  }

  if (supplier && supplier.length > 0) {
    query = query.in("supplier_id", supplier);
  }

  if (country && country.length > 0) {
    query = query.in("service_country", country);
  }

  if (city && city.length > 0) {
    query = query.in("service_city", city);
  }

  if (agency && agency.length > 0) {
    query = query.in("agency_name", agency);
  }

  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `short_query_id.ilike.${searchTerm},service_name.ilike.${searchTerm},supplier_name.ilike.${searchTerm},traveler_name.ilike.${searchTerm}`
    );
  }

  // Date range filtering - handle different date columns based on service type
  if (start_date && end_date) {
    query = query.or(
      `and(service_type.eq.hotel,check_in_date.lte.${end_date},check_out_date.gte.${start_date}),and(service_type.eq.tour,tour_date.gte.${start_date},tour_date.lte.${end_date}),and(service_type.eq.transfer,pickup_date.lte.${end_date},drop_date.gte.${start_date})`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[getQueryBookingsWithActivities] Error:", error);
    return { data: [], totalItems: 0 };
  }

  return {
    data: data as BookingWithActivity[],
    totalItems: count || 0,
  };
}

export async function getBookingOptions(queryId: string): Promise<IOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_bookings")
    .select("id, title")
    .eq("query_id", queryId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getBookingOptions]", error);
    return [];
  }

  return (data ?? []).map((b) => ({ value: b.id, label: b.title ?? b.id }));
}

export async function getAvailableActivitiesForBooking(queryId: string, optionNumber?: number | null): Promise<ActivityDropdownItem[]> {
  const supabase = await createClient();

  const { data: activities, error } = await supabase.rpc("get_available_activities_for_booking", {
    p_query_id: queryId,
    p_option_number: optionNumber ?? null,
  });

  if (error) {
    console.error("[getAvailableActivitiesForBooking] RPC error:", error);
    return [];
  }

  return (activities || []) as ActivityDropdownItem[];
}

// Get single booking by ID
export async function getBookingById(bookingId: string): Promise<OpsBooking | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_whitelabel_booking_details")
    .select(
      `*,
      id:booking_id,
      notes:booking_notes
    `
    )
    .eq("booking_id", bookingId)
    .single();

  if (error) {
    console.error("[getBookingById] Error:", error);
    return null;
  }

  return data as OpsBooking;
}

export async function upsertBooking(
  input: BookingInput,
  bookingId?: string
): Promise<{ success: boolean; booking_id?: string; error?: string }> {
  const supabase = await createClient();

  const bookingData = {
    ...(bookingId && { id: bookingId }),
    query_id: input.query_id,
    itinerary_id: input.itinerary_id,
    title: input.title,
    supplier_id: input.supplier_id,
    supplier_item_id: input.supplier_item_id,
    booking_status: input.booking_status,
    voucher_status: input.voucher_status,
    confirmation_no: input.confirmation_no,
    notes: input.notes,
    reconfirmed_by: input.reconfirmed_by,
    cost_price: input.cost_price ?? 0,
    currency: input.currency,
    payment_plan_id: input.payment_plan_id,
    vehicle_id: input.vehicle_id,
    driver_id: input.driver_id,
    restaurant_id: input.restaurant_id,
    guide_id: input.guide_id,
    meeting_point: input.meeting_point,
    welcome_placard: input.welcome_placard,
  };

  const { data, error } = await supabase.from("whitelabel_bookings").upsert(bookingData).select("id").single();

  if (error) {
    console.error("[upsertBooking] Error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, booking_id: data.id };
}

export async function updateBooking(
  bookingId: string,
  updates: UpdateBookingInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("whitelabel_bookings").update(updates).eq("id", bookingId);

  if (error) {
    console.error("[updateBooking] Error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateBookingStatus(
  bookingId: string,
  bookingStatus?: BookingStatus,
  voucherStatus?: VoucherStatus
): Promise<{ success: boolean; error?: string }> {
  const updates: any = {};
  if (bookingStatus) updates.booking_status = bookingStatus;
  if (voucherStatus) updates.voucher_status = voucherStatus;

  return updateBooking(bookingId, updates);
}

export async function autopopulateBookings(
  queryId: string,
  optionNumber: number = 1,
  clearExisting: boolean = false
): Promise<{ success: boolean; inserted?: number; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("autopopulate_bookings", {
    p_query_id: queryId,
    p_option_number: optionNumber,
    p_clear_existing: clearExisting,
  });

  if (error) {
    console.error("[autopopulateBookings] RPC error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, inserted: data as number };
}

export async function deleteBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("whitelabel_bookings").delete().eq("id", bookingId).is("payment_plan_id", null);

  if (error) {
    console.error("[deleteBooking] Error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// Consolidated Server Actions for Booking Operations
// =====================================================

export async function saveBooking<T extends HotelActivity | TourActivity | TransferActivity>({
  activityId,
  activityData,
  breakups,
  bookingData,
  existingBookingId,
}: {
  activityId: string;
  activityData: Partial<T>;
  breakups: ServiceBreakup[];
  bookingData: BookingInput;
  existingBookingId?: string;
}): Promise<{ success: boolean; booking_id?: string; error?: string }> {
  try {
    // 1. Update activity and upsert booking in parallel
    const [activityResult, bookingResult] = await Promise.all([
      updateActivity(activityId, activityData),
      upsertBooking(bookingData, existingBookingId),
    ]);

    if (!activityResult) {
      return { success: false, error: "Failed to update activity" };
    }

    if (!bookingResult.success) {
      return { success: false, error: bookingResult.error || "Failed to save booking" };
    }

    // 2. Save breakups using existing data access functions
    if (breakups.length > 0) {
      const newBreakups = breakups.filter((b) => isTempBreakup(b));
      const existingBreakups = breakups.filter((b) => !isTempBreakup(b));

      // Create new breakups in bulk (single DB call)
      if (newBreakups.length > 0) {
        const breakupInputs = newBreakups.map((b) => ({
          chat_id: b.chat_id,
          message_id: b.message_id,
          activity_id: b.activity_id,
          day_number: b.day_number,
          service_date: b.service_date || null,
          service_type: b.service_type,
          service_name: b.service_name,
          service_id: b.service_id || null,
          quantity: b.quantity || 1,
          unit_type: b.unit_type as any,
          base_cost: b.base_cost || 0,
          discount_amount: b.discount_amount || 0,
          markup_amount: b.markup_amount || 0,
          tax_amount: b.tax_amount || 0,
          final_cost: b.final_cost || 0,
          currency: b.currency,
          price_source: "individual" as const,
        }));

        const createdBreakups = await createBreakupsBulk(breakupInputs);
        if (createdBreakups.length === 0) {
          console.error(`[saveBooking] Failed to create new breakups`);
        }
      }

      // Update existing breakups
      if (existingBreakups.length > 0) {
        await Promise.all(
          existingBreakups.map((b) =>
            updateServiceBreakup(b.id, {
              day_number: b.day_number,
              service_date: b.service_date || null,
              service_name: b.service_name,
              service_type: b.service_type,
              quantity: b.quantity,
              unit_type: b.unit_type as any,
              base_cost: b.base_cost,
              discount_amount: b.discount_amount,
              markup_amount: b.markup_amount,
              tax_amount: b.tax_amount,
              final_cost: b.final_cost,
            })
          )
        );
      }
    }

    return {
      success: true,
      booking_id: bookingResult.booking_id,
    };
  } catch (error: any) {
    console.error(`[saveBooking] Error:`, error);
    return { success: false, error: error.message || "Unknown error occurred" };
  }
}

export async function fetchAgencies(search: string = ""): Promise<{ label: string; value: string }[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return [];

  let query = supabase
    .from("vw_whitelabel_booking_details")
    .select("agency_name")
    .eq("dmc_id", (user as any).dmc.id)
    .not("agency_name", "is", null)
    .order("agency_name", { ascending: true });

  if (search) {
    query = query.ilike("agency_name", `%${search}%`);
  }

  const { data, error } = await query.limit(50);
  if (error) return [];

  const unique = [...new Set((data || []).map((r: any) => r.agency_name).filter(Boolean))];
  return (unique as string[]).map((name) => ({ label: name, value: name }));
}

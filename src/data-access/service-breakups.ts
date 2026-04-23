"use server";

import { createClient } from "@/utils/supabase/server";

export type ServiceType = "hotel" | "tour" | "transfer" | "combo" | "meal" | "other";

export interface DiscountDetail {
  name: string;
  amount: number;
  percentage?: number;
}

export interface ServiceBreakup {
  id: string;
  chat_id: string;
  message_id: string;

  // Day info
  day_number: number | null;
  service_date?: string; // V3: YYYY-MM-DD format
  date_range?: string; // V2 legacy

  // Service info
  service_type: ServiceType;
  service_id?: string;
  room_id?: string; // V3: For hotels
  activity_id?: string; // V3: Link to itinerary_activities
  service_name: string;

  // V3 Pricing breakdown (preferred)
  base_cost?: number; // V3: Pre-discount price
  quantity?: number; // V3: Number of units
  discount_name?: string; // V3: Name of discount applied
  price_source?: "individual" | "combo" | "included"; // V3
  included_in?: string; // V3: If included in another service

  // V2 Pricing breakdown (backwards compatible)
  original_cost?: number; // V2: maps to base_cost
  quantity_value?: number; // V2: maps to quantity

  // Common pricing fields
  discount_amount: number;
  discount_details?: DiscountDetail[]; // V2 legacy
  markup_amount: number;
  tax_amount: number;
  final_cost: number;

  // Rate details
  rate_per_unit?: number;
  unit_type?: string;
  season_name?: string;

  // Legacy fields (optional)
  line_items?: Array<{
    description: string;
    amount: number;
    quantity: number;
    unit?: string;
  }>;
  subtotals?: {
    accommodation?: number;
    meals?: number;
    supplements?: number;
    tours_transfers?: number;
  };
  total_amount?: number;
  currency: string;
  traveler_breakdown?: {
    adults: number;
    children: number;
    per_adult: number;
    per_child: number;
  };
  season_info?: {
    season_name: string;
    date_range: string;
    rate_per_night: number;
  };
  calculation_notes?: string[];

  // Service context (generic - transfer routes, tour timing, etc.)
  service_context?: string;

  created_at: string;
  updated_at?: string;
}

export interface CreateServiceBreakupInput {
  chat_id: string;
  message_id: string;
  service_type: ServiceType;
  service_id?: string;
  service_name: string;
  line_items: ServiceBreakup["line_items"];
  subtotals: ServiceBreakup["subtotals"];
  total_amount: number;
  currency?: string;
  traveler_breakdown?: ServiceBreakup["traveler_breakdown"];
  season_info?: ServiceBreakup["season_info"];
  calculation_notes?: string[];
}

/**
 * Create a new service breakup record
 */
export async function createServiceBreakup(input: CreateServiceBreakupInput): Promise<ServiceBreakup | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_breakups")
    .insert({
      chat_id: input.chat_id,
      message_id: input.message_id,
      service_type: input.service_type,
      service_id: input.service_id,
      service_name: input.service_name,
      line_items: input.line_items,
      subtotals: input.subtotals,
      total_amount: input.total_amount,
      currency: input.currency || "USD",
      traveler_breakdown: input.traveler_breakdown,
      season_info: input.season_info,
      calculation_notes: input.calculation_notes || [],
    })
    .select()
    .single();

  if (error) {
    console.error("[createServiceBreakup] Error:", error);
    return null;
  }

  return data;
}

/**
 * Create multiple service breakups in a batch
 */
export async function createServiceBreakupsBatch(
  inputs: CreateServiceBreakupInput[]
): Promise<ServiceBreakup[] | null> {
  if (inputs.length === 0) return [];

  const supabase = await createClient();

  const { data, error} = await supabase
    .from("service_breakups")
    .insert(
      inputs.map((input) => ({
        chat_id: input.chat_id,
        message_id: input.message_id,
        service_type: input.service_type,
        service_id: input.service_id,
        service_name: input.service_name,
        line_items: input.line_items,
        subtotals: input.subtotals,
        total_amount: input.total_amount,
        currency: input.currency || "USD",
        traveler_breakdown: input.traveler_breakdown,
        season_info: input.season_info,
        calculation_notes: input.calculation_notes || [],
      }))
    )
    .select();

  if (error) {
    console.error("[createServiceBreakupsBatch] Error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data;
}

/**
 * Get all service breakups for a chat
 * @param chatId - Chat ID
 * @param optionNumber - Optional option number to filter by (defaults to showing all)
 */
export async function getServiceBreakupsByChat(
  chatId: string,
  optionNumber?: number
): Promise<ServiceBreakup[]> {
  const supabase = await createClient();

  let query = supabase
    .from("service_breakups")
    .select("*")
    .eq("chat_id", chatId);

  // Filter by option_number if specified
  if (optionNumber !== undefined) {
    query = query.eq("option_number", optionNumber);
  }

  query = query
    .order("day_number", { ascending: true, nullsFirst: false })
    .order("service_type", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("[getServiceBreakupsByChat] Error:", error);
    return [];
  }

  return data || [];
}

/**
 * Get service breakups for a specific message
 */
export async function getServiceBreakupsByMessage(messageId: string): Promise<ServiceBreakup[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_breakups")
    .select("*")
    .eq("message_id", messageId)
    .order("service_type", { ascending: true });

  if (error) {
    console.error("[getServiceBreakupsByMessage] Error:", error);
    return [];
  }

  return data || [];
}

/**
 * Get service breakups filtered by service type
 */
export async function getServiceBreakupsByType(
  chatId: string,
  serviceType: ServiceType
): Promise<ServiceBreakup[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_breakups")
    .select("*")
    .eq("chat_id", chatId)
    .eq("service_type", serviceType)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getServiceBreakupsByType] Error:", error);
    return [];
  }

  return data || [];
}

/**
 * Delete service breakups for a message (when regenerating)
 */
export async function deleteServiceBreakupsByMessage(messageId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("service_breakups").delete().eq("message_id", messageId);

  if (error) {
    console.error("[deleteServiceBreakupsByMessage] Error:", error);
    return false;
  }

  return true;
}

/**
 * Get aggregated totals by service type for a chat
 */
export async function getServiceTotalsByChat(chatId: string): Promise<Record<ServiceType, number>> {
  const breakups = await getServiceBreakupsByChat(chatId);

  const totals: Record<ServiceType, number> = {
    hotel: 0,
    tour: 0,
    transfer: 0,
    combo: 0,
    meal: 0,
    other: 0,
  };

  breakups.forEach((breakup) => {
    totals[breakup.service_type] += breakup.total_amount;
  });

  return totals;
}

export type UnitType = "adult" | "child" | "teen" | "infant" | "vehicle" | "room" | "tour" | "day" | "night" | "package";
export type PriceSource = "individual" | "combo" | "standard" | "complimentary" | "included";

export interface ManualBreakupInput {
  chat_id: string;
  message_id: string;
  day_number?: number | null;
  service_date?: string | null;
  service_name: string;
  service_type: ServiceType;
  quantity: number;
  unit_type?: UnitType | null;
  rate_per_unit?: number | null;
  base_cost: number;
  discount_amount?: number | null;
  discount_name?: string | null;
  markup_amount?: number | null;
  tax_amount?: number | null;
  final_cost: number;
  currency?: string;
  calculation_notes?: string[] | null;
  option_number?: number;
  cost_price?: number | null;
  price_source?: PriceSource;
  included_in?: string | null;
  service_id?: string | null;
  room_id?: string | null;
  activity_id?: string | null;
}

/**
 * Create a manual service breakup entry (for user-added breakups)
 */
export async function createManualBreakup(input: ManualBreakupInput): Promise<ServiceBreakup | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_breakups")
    .insert({
      chat_id: input.chat_id,
      message_id: input.message_id,
      day_number: input.day_number,
      service_date: input.service_date,
      service_name: input.service_name,
      service_type: input.service_type,
      quantity: input.quantity || 1,
      unit_type: input.unit_type,
      rate_per_unit: input.rate_per_unit,
      base_cost: input.base_cost,
      discount_amount: input.discount_amount || 0,
      discount_name: input.discount_name,
      markup_amount: input.markup_amount || 0,
      tax_amount: input.tax_amount || 0,
      final_cost: input.final_cost,
      currency: input.currency || "USD",
      calculation_notes: input.calculation_notes || [],
      option_number: input.option_number || 1,
      cost_price: input.cost_price || 0,
      price_source: input.price_source || "individual",
      included_in: input.included_in,
      service_id: input.service_id,
      room_id: input.room_id,
      activity_id: input.activity_id,
    })
    .select()
    .single();

  if (error) {
    console.error("[createManualBreakup] Error:", error);
    return null;
  }

  return data;
}

/**
 * Create multiple breakups in bulk (single DB call)
 */
export async function createBreakupsBulk(inputs: ManualBreakupInput[]): Promise<ServiceBreakup[]> {
  if (inputs.length === 0) return [];

  const supabase = await createClient();

  const insertData = inputs.map((input) => ({
    chat_id: input.chat_id,
    message_id: input.message_id,
    day_number: input.day_number,
    service_date: input.service_date,
    service_name: input.service_name,
    service_type: input.service_type,
    quantity: input.quantity || 1,
    unit_type: input.unit_type,
    rate_per_unit: input.rate_per_unit,
    base_cost: input.base_cost,
    discount_amount: input.discount_amount || 0,
    discount_name: input.discount_name,
    markup_amount: input.markup_amount || 0,
    tax_amount: input.tax_amount || 0,
    final_cost: input.final_cost,
    currency: input.currency || "USD",
    calculation_notes: input.calculation_notes || [],
    option_number: input.option_number || 1,
    cost_price: input.cost_price || 0,
    price_source: input.price_source || "individual",
    included_in: input.included_in,
    service_id: input.service_id,
    room_id: input.room_id,
    activity_id: input.activity_id,
  }));

  const { data, error } = await supabase
    .from("service_breakups")
    .insert(insertData)
    .select();

  if (error) {
    console.error("[createBreakupsBulk] Error:", error);
    return [];
  }

  return data || [];
}

/**
 * Update a service breakup entry
 */
export async function updateServiceBreakup(
  id: string,
  input: Partial<ManualBreakupInput>
): Promise<ServiceBreakup | null> {
  const supabase = await createClient();

  // Build update object, only including defined fields
  const updateData: Record<string, any> = {};
  if (input.day_number !== undefined) updateData.day_number = input.day_number;
  if (input.service_date !== undefined) updateData.service_date = input.service_date;
  if (input.service_name !== undefined) updateData.service_name = input.service_name;
  if (input.service_type !== undefined) updateData.service_type = input.service_type;
  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.unit_type !== undefined) updateData.unit_type = input.unit_type;
  if (input.rate_per_unit !== undefined) updateData.rate_per_unit = input.rate_per_unit;
  if (input.base_cost !== undefined) updateData.base_cost = input.base_cost;
  if (input.discount_amount !== undefined) updateData.discount_amount = input.discount_amount;
  if (input.discount_name !== undefined) updateData.discount_name = input.discount_name;
  if (input.markup_amount !== undefined) updateData.markup_amount = input.markup_amount;
  if (input.tax_amount !== undefined) updateData.tax_amount = input.tax_amount;
  if (input.final_cost !== undefined) updateData.final_cost = input.final_cost;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.calculation_notes !== undefined) updateData.calculation_notes = input.calculation_notes;
  if (input.price_source !== undefined) updateData.price_source = input.price_source;
  if (input.included_in !== undefined) updateData.included_in = input.included_in;
  if (input.activity_id !== undefined) updateData.activity_id = input.activity_id;

  const { data, error } = await supabase
    .from("service_breakups")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateServiceBreakup] Error:", error);
    return null;
  }

  return data;
}

/**
 * Delete a single service breakup by ID
 */
export async function deleteServiceBreakup(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("service_breakups").delete().eq("id", id);

  if (error) {
    console.error("[deleteServiceBreakup] Error:", error);
    return false;
  }

  return true;
}

/**
 * Get service breakups by activity_id
 */
export async function getServiceBreakupsByActivityId(activityId: string): Promise<ServiceBreakup[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_breakups")
    .select("*")
    .eq("activity_id", activityId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getServiceBreakupsByActivityId] Error:", error);
    return [];
  }

  return data || [];
}

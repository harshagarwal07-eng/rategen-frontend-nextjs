"use server";

import type { GuestDetail, ArrivalDeparture, Preference, DocumentFile } from "@/types/questionnaire";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "./auth";
import type { IOption } from "@/types/common";

type QuestionnaireField = "arrival_and_departure" | "preferences" | "documents";

export async function getQuestionnaire(queryId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("whitelabel_query_questionnaire")
    .select("*")
    .eq("q_id", queryId)
    .single();

  if (error && error.code !== "PGRST116") {
    return { error: error.message };
  }

  const { count: guestCount } = await supabase
    .from("whitelabel_query_guest_map")
    .select("id", { count: "exact", head: true })
    .eq("q_id", queryId);

  return { data: { ...(data || {}), guest_count: guestCount || 0 } };
}

export async function updateQuestionnaireField(
  queryId: string,
  field: QuestionnaireField,
  data: ArrivalDeparture[] | Preference[] | DocumentFile[]
) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const existing = await getQuestionnaire(queryId);

  if (existing.data) {
    const { data: result, error } = await supabase
      .from("whitelabel_query_questionnaire")
      .update({
        [field]: data,
        updated_at: new Date().toISOString(),
      })
      .eq("q_id", queryId)
      .select()
      .single();

    return { data: result, error: error?.message };
  } else {
    const { data: result, error } = await supabase
      .from("whitelabel_query_questionnaire")
      .insert({
        q_id: queryId,
        [field]: data,
      })
      .select()
      .single();

    return { data: result, error: error?.message };
  }
}

export async function getQuestionnaireCompletionStatus(queryId: string) {
  const result = await getQuestionnaire(queryId);
  if (result.error) {
    return { guestDetails: false, arrivalDeparture: false, preferences: false, documents: false };
  }

  const q = result.data;
  return {
    guestDetails: (q?.guest_count || 0) > 0,
    arrivalDeparture: (q?.arrival_and_departure?.length || 0) > 0,
    preferences: (q?.preferences?.length || 0) > 0,
    documents: (q?.documents?.length || 0) > 0,
  };
}

export async function fetchGuestOptions(taId: string, query: string): Promise<IOption[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("travel_agent_guest_details")
    .select("id, first_name, last_name, passport_number, countries(country_code)")
    .eq("ta_id", taId)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,passport_number.ilike.%${query}%`)
    .limit(20);

  if (error || !data) return [];

  return data.map((g) => {
    const fullName = `${g.first_name} ${g.last_name}`.trim();
    const passport = g.passport_number ?? "";
    const countryCode = (g.countries as any)?.country_code ?? undefined;
    return {
      value: g.id as string,
      label: passport ? `${fullName} | Passport No. - ${passport}` : fullName,
      code: countryCode,
    };
  });
}

export async function fetchGuestById(guestId: string): Promise<GuestDetail | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("travel_agent_guest_details")
    .select("*, countries(country_code)")
    .eq("id", guestId)
    .single();

  if (error || !data) return null;

  return {
    guest_id: data.id,
    type: data.pax_type ?? "adult",
    title: data.title ?? "Mr",
    first_name: data.first_name ?? "",
    last_name: data.last_name ?? "",
    gender: data.gender ?? "male",
    date_of_birth: data.dob ?? "",
    nationality: data.nationality ?? "",
    nationality_name: data.nationality_name ?? "",
    nationality_code: (data.countries as any)?.country_code ?? "",
    passport_number: data.passport_number ?? "",
    passport_issue_date: data.passport_issue_date ?? "",
    passport_expiry: data.passport_expiry ?? "",
    contact_mobile: data.phone ?? "",
    dietary_preference: data.dietary_preference ?? "none",
    dietary_custom: data.dietary_custom ?? "",
    food_allergies: data.food_allergies ?? "",
    medical_restrictions: data.medical_restrictions ?? "",
    bed_type: data.bed_type ?? undefined,
    smoking: data.smoking ?? false,
    medical_conditions: data.medical_conditions ?? "",
    mobility_assistance: data.mobility_assistance ?? "",
  };
}

export async function fetchQueryGuests(queryId: string): Promise<{
  leadGuest: GuestDetail | null;
  passengers: GuestDetail[];
  error?: string;
}> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { leadGuest: null, passengers: [], error: "Unauthorized" };

  const { data, error } = await supabase
    .from("vw_whitelabel_query_guest_details")
    .select("*")
    .eq("q_id", queryId)
    .order("guest_order", { ascending: true });

  if (error) return { leadGuest: null, passengers: [], error: error.message };
  if (!data || data.length === 0) return { leadGuest: null, passengers: [] };

  const toGuestDetail = (row: any): GuestDetail => ({
    guest_id: row.guest_id,
    type: row.pax_type ?? "adult",
    title: row.title ?? "Mr",
    first_name: row.first_name ?? "",
    last_name: row.last_name ?? "",
    gender: row.gender ?? "male",
    date_of_birth: row.dob ?? "",
    nationality: row.nationality ?? "",
    nationality_name: row.nationality_name ?? "",
    passport_number: row.passport_number ?? "",
    passport_issue_date: row.passport_issue_date ?? "",
    passport_expiry: row.passport_expiry ?? "",
    contact_mobile: row.phone ?? "",
    dietary_preference: row.dietary_preference ?? "none",
    dietary_custom: row.dietary_custom ?? "",
    food_allergies: row.food_allergies ?? "",
    medical_restrictions: row.medical_restrictions ?? "",
    bed_type: row.bed_type ?? undefined,
    smoking: row.smoking ?? false,
    medical_conditions: row.medical_conditions ?? "",
    mobility_assistance: row.mobility_assistance ?? "",
  });

  const leadRow = data.find((r) => r.is_lead);
  const passengerRows = data.filter((r) => !r.is_lead);

  return {
    leadGuest: leadRow ? toGuestDetail(leadRow) : null,
    passengers: passengerRows.map(toGuestDetail),
  };
}

// Single atomic RPC: inserts new guests (temp-* ids), updates existing, replaces map entries.
export async function saveAllGuests(
  queryId: string,
  taId: string,
  guests: Array<{ guest: GuestDetail; order: number; isLead: boolean }>
): Promise<{ results: Array<{ order: number; guestId: string }>; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { results: [], error: "Unauthorized" };

  const payload = guests.map(({ guest, order, isLead }) => ({
    guest_id: guest.guest_id ?? null,
    order,
    is_lead: isLead,
    pax_type: guest.type,
    title: guest.title,
    first_name: guest.first_name,
    last_name: guest.last_name,
    gender: guest.gender,
    dob: guest.date_of_birth || null,
    nationality: guest.nationality || null,
    nationality_name: guest.nationality_name || null,
    passport_number: guest.passport_number || null,
    passport_issue_date: guest.passport_issue_date || null,
    passport_expiry: guest.passport_expiry || null,
    phone: guest.contact_mobile || null,
    dietary_preference: guest.dietary_preference ?? null,
    dietary_custom: guest.dietary_custom || null,
    food_allergies: guest.food_allergies || null,
    medical_restrictions: guest.medical_restrictions || null,
    bed_type: guest.bed_type ?? null,
    smoking: guest.smoking ?? false,
    medical_conditions: guest.medical_conditions || null,
    mobility_assistance: guest.mobility_assistance || null,
  }));

  const { data, error } = await supabase.rpc("save_whitelabel_questionnaire_guests", {
    p_query_id: queryId,
    p_ta_id: taId,
    p_guests: payload,
  });

  if (error) return { results: [], error: error.message };
  return { results: data as Array<{ order: number; guestId: string }> };
}

export async function updateGuestPreferences(
  updates: Array<{
    guestId: string;
    dietary_preference?: string;
    dietary_custom?: string;
    food_allergies?: string;
    medical_restrictions?: string;
    bed_type?: string;
    smoking?: boolean;
  }>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  for (const update of updates) {
    const { error } = await supabase
      .from("travel_agent_guest_details")
      .update({
        dietary_preference: update.dietary_preference ?? null,
        dietary_custom: update.dietary_custom ?? null,
        food_allergies: update.food_allergies ?? null,
        medical_restrictions: update.medical_restrictions ?? null,
        bed_type: update.bed_type ?? null,
        smoking: update.smoking ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", update.guestId);

    if (error) return { error: error.message };
  }

  return {};
}

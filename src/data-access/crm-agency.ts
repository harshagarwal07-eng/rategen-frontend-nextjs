"use server";

import { ITaDetailsForm } from "@/components/forms/schemas/ta-details-schema";
import { ICrmSupportMessage, OrgCatagory, OrgStatus, SupportMessageRole } from "@/types/crm-agency";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "./auth";
import { FileAttachment } from "@/types/common";

export async function updateAgency(formData: ITaDetailsForm) {
  const supabase = await createClient();

  if (!formData.id) return { error: "Agency ID is required" };

  const updateData: {
    source?: string;
    category?: string;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (formData.source) updateData.source = formData.source;
  if (formData.category) updateData.category = formData.category;

  const { data, error } = await supabase
    .from("whitelabel_ta_dmc_map")
    .update(updateData)
    .eq("whitelabel_ta_id", formData.id)
    .select()
    .single();

  if (error) return { error: error.message };

  return { data };
}

export async function updateAgencyStatus(ta_id: string, status: OrgStatus) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_ta_dmc_map")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("whitelabel_ta_id", ta_id)
    .select()
    .single();

  if (error) return { error: error.message };

  return { data };
}

export async function updateAgencySource(ta_id: string, source: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_ta_dmc_map")
    .update({ source, updated_at: new Date().toISOString() })
    .eq("whitelabel_ta_id", ta_id)
    .select()
    .single();

  if (error) return { error: error.message };

  return { data };
}

export async function updateAgencyCategory(ta_id: string, category: OrgCatagory) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_ta_dmc_map")
    .update({ category, updated_at: new Date().toISOString() })
    .eq("whitelabel_ta_id", ta_id)
    .select()
    .single();

  if (error) return { error: error.message };

  return { data };
}

export async function updateAgencyFlagMark(ta_id: string, flagMark: boolean) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_ta_dmc_map")
    .update({ is_flagged: flagMark, updated_at: new Date().toISOString() })
    .eq("whitelabel_ta_id", ta_id)
    .select()
    .single();

  if (error) return { error: error.message };

  return { data };
}

export async function getCrmAgencyOptions(dmc_id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_whitelabel_ta_details")
    .select(
      `
      ta_id,
      name,
      ta_admin_name,
      ta_admin_phone,
      ta_admin_email
    `
    )
    .eq("dmc_id", dmc_id)
    .order("name", { ascending: true });

  if (error) {
    console.error(`Error fetching agency options: ${error.message}`);
    return [];
  }

  return data.map((agency: any) => {
    return {
      label: agency.name,
      value: agency.ta_id,
      email: agency.ta_admin_email,
      admin_name: agency.ta_admin_name,
      admin_phone: agency.ta_admin_phone,
    };
  });
}

export async function getAgencies(
  dmc_id: string,
  params?: {
    search?: string;
    sort?: Array<{ id: string; desc: boolean }>;
    status?: string;
    category?: string[];
    page?: number;
    perPage?: number;
  }
) {
  const supabase = await createClient();

  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 50;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("vw_whitelabel_ta_details")
    .select(
      "ta_id,name, ta_admin_name, ta_admin_phone, ta_admin_email, created_at, updated_at, status, category, country, country_name, city, city_name, source, source_name, queries_count, is_flagged",
      { count: "exact" }
    )
    .eq("dmc_id", dmc_id);

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,ta_admin_name.ilike.%${params.search}%`);
  }

  if (params?.category?.length) {
    query = query.in("category", params.category);
  }

  query = query.order(params?.sort?.[0]?.id ?? "updated_at", {
    ascending: !(params?.sort?.[0]?.desc ?? true), // default: newest first
  });

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching agencies: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  // Transform the data to match ICrmTaDetails interface
  const transformedData = data?.map((agency) => ({
    ...agency,
    dmc_pin_count: undefined,
    booking_count: undefined,
    token_used: undefined,
  }));

  return {
    data: transformedData || [],
    totalItems: count ?? 0,
  };
}

export async function getAgencyDetailsById(ta_id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.from("vw_whitelabel_ta_details").select("*").eq("ta_id", ta_id).single();

  if (error) {
    console.error(`Error fetching agency details: ${error.message}`);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ============= AGENCY LOOKUP FUNCTIONS =============

export type AgencyEmailLookupResult =
  | { status: "not_found" }
  | { status: "role_conflict" }
  | { status: "already_added"; agency_name: string }
  | {
      status: "found";
      agencyData: {
        ta_id: string;
        name: string;
        website?: string;
        city?: string;
        country?: string;
        admin_id: string;
        admin_name: string;
        admin_phone: string;
        admin_email: string;
        is_admin: boolean;
        lookup_email: string;
      };
    };

export async function lookupAgencyByEmail(email: string, dmc_id: string): Promise<AgencyEmailLookupResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("lookup_agent_by_email", {
    p_email: email.toLowerCase().trim(),
    p_dmc_id: dmc_id,
  });

  if (error) throw new Error(error.message);

  const result = data as Record<string, unknown>;

  switch (result.status) {
    case "not_found":
      return { status: "not_found" };

    case "role_conflict":
      return { status: "role_conflict" };

    case "already_added":
      return { status: "already_added", agency_name: result.agency_name as string };

    case "found":
      return {
        status: "found",
        agencyData: {
          ta_id: result.ta_id as string,
          name: result.name as string,
          website: result.website as string | undefined,
          city: result.city as string | undefined,
          country: result.country as string | undefined,
          admin_id: result.admin_id as string,
          admin_name: result.admin_name as string,
          admin_phone: result.admin_phone as string,
          admin_email: result.admin_email as string,
          is_admin: result.is_admin as boolean,
          lookup_email: result.lookup_email as string,
        },
      };

    default:
      throw new Error(`Unexpected lookup status: ${result.status}`);
  }
}

// ============= AGENCY CREATION / ASSOCIATION FUNCTIONS =============

export async function createAgency(
  formData: {
    name: string;
    adminName: string;
    adminEmail: string;
    adminPhone: string;
    password: string;
    streetAddress?: string;
    city_id: string;
    country_id: string;
    website?: string;
  },
  dmc_id: string
) {
  const supabase = await createClient(true);

  const { data, error } = await supabase.auth.admin.createUser({
    email: formData.adminEmail,
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      name: formData.name,
      userName: formData.adminName,
      streetAddress: formData.streetAddress ?? "",
      city_id: formData.city_id,
      country_id: formData.country_id,
      phone: formData.adminPhone.replace(/\+/g, ""),
      role: "ta_admin",
      website: formData.website ?? "",
      dmc_id,
      create: true,
    },
  });

  if (error) return { error: error.message };
  return { data };
}

export async function associateExistingAgency(ta_id: string, admin_id: string, dmc_id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("associate_whitelabel_agency", {
    p_ta_id: ta_id,
    p_admin_id: admin_id,
    p_dmc_id: dmc_id,
  });
  if (error) return { error: error.message };

  const result = data as { success: boolean; error?: string; constraint?: string };
  if (!result.success) {
    console.error("associateExistingAgency failed:", result.error, "constraint:", result.constraint);
    return { error: result.error ?? "Association failed" };
  }

  return { data: { ta_id, dmc_id } };
}

// ============= SUPPORT MESSAGE FUNCTIONS =============

export async function getSupportMessages(taId: string): Promise<ICrmSupportMessage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_support_messages")
    .select(
      `id, created_at, updated_at, role, text, files, ta_id,
       created_by:profile!whitelabel_support_created_by_fkey(user_id, name)`
    )
    .eq("ta_id", taId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching support messages:", error);
    return [];
  }

  // Transform the data to match ICrmSupportMessage type
  const messages = (data || []).map((msg: any) => ({
    ...msg,
    files: msg.files || [],
    edited: false,
    created_by: Array.isArray(msg.created_by) ? msg.created_by[0] : msg.created_by,
  }));

  return messages as ICrmSupportMessage[];
}

export async function sendSupportMessage(taId: string, text: string, files?: FileAttachment[]) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { error: "User not authenticated" };
  }

  const { data, error } = await supabase
    .from("whitelabel_support_messages")
    .insert({
      ta_id: taId,
      text,
      role: "dmc" as SupportMessageRole,
      files: files || [],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error sending support message:", error);
    return { error: error.message };
  }

  return { data: data as ICrmSupportMessage };
}

export async function createSystemSupportMessage(taId: string, text: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_support_messages")
    .insert({
      ta_id: taId,
      text,
      role: "system" as SupportMessageRole,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating system support message:", error);
    return { error: error.message };
  }

  return { data: data as ICrmSupportMessage };
}

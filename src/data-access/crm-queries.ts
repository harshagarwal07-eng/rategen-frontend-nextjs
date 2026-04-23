"use server";

import { IQueryForm } from "@/components/forms/schemas/query-form-schema";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "./auth";
import { IQueryMessage, QueryRoles, QueryStatus } from "@/types/crm-query";
import { FileAttachment } from "@/types/common";
import { revalidatePath } from "next/cache";

export async function createCrmQuery(query: IQueryForm) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { travel_countries = [], message, ...queryData } = query;
  const { data, error } = await supabase.rpc("create_whitelabel_query", {
    _query: queryData,
    _message: message,
    _travel_countries: travel_countries,
    _ta_id: queryData.ta_id,
    _dmc_id: user.dmc.id,
    _created_by: user.id,
  });

  if (error) return { error: error.message };

  return { data: data.query };
}

export async function updateCrmQuery(queryId: string, query: IQueryForm) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { travel_countries = [], ...queryData } = query;

  const { data: updatedQuery, error } = await supabase
    .from("whitelabel_queries")
    .update({
      traveler_name: queryData.traveler_name,
      nationality: queryData.nationality,
      travel_date: queryData.travel_date,
      message: queryData.message,
      pax_details: queryData.pax_details,
      source: queryData.source,
      query_type: queryData.query_type,
      services: queryData.services,
      duration: queryData.duration,
      ta_id: queryData.ta_id,
    })
    .eq("id", queryId)
    .select()
    .single();

  if (error) return { error: error.message };

  const { error: deleteError } = await supabase.from("whitelabel_query_country_map").delete().eq("query_id", queryId);

  if (deleteError) return { error: deleteError.message };

  if (travel_countries.length > 0) {
    const countryLinks = travel_countries.map((countryId: string) => ({
      query_id: queryId,
      travel_country: countryId,
    }));

    const { error: insertError } = await supabase.from("whitelabel_query_country_map").insert(countryLinks);

    if (insertError) return { error: insertError.message };
  }

  return { data: updatedQuery };
}

export async function getCrmQueryById(queryId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_queries")
    .select("*")
    .eq("id", queryId)
    .is("deleted_at", null)
    .single();

  if (error) return { error: error.message };

  return { data };
}

export type ActiveQuerySummary = {
  id: string;
  query_id: string;
  traveler_name: string;
  travel_country_names?: string[];
};

export async function getActiveQueryIds(
  dmcId?: string
): Promise<{ data: ActiveQuerySummary[] } | { error: string }> {
  let resolvedDmcId = dmcId;
  if (!resolvedDmcId) {
    const user = await getCurrentUser();
    if (user?.dmc?.id) {
      resolvedDmcId = user.dmc.id;
    } else {
      return { error: "Could not resolve DMC ID" };
    }
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_whitelabel_query_details")
    .select("id, query_id, traveler_name, travel_country_names")
    .eq("dmc_id", resolvedDmcId)
    .is("deleted_at", null)
    .not("status", "in", '("cancelled","completed")')
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function searchQueries(
  dmcId?: string,
  search?: string
): Promise<{ data: ActiveQuerySummary[] } | { error: string }> {
  let resolvedDmcId = dmcId;
  if (!resolvedDmcId) {
    const user = await getCurrentUser();
    if (user?.dmc?.id) {
      resolvedDmcId = user.dmc.id;
    } else {
      return { error: "Could not resolve DMC ID" };
    }
  }

  const supabase = await createClient();
  const term = search?.trim();

  let q = supabase
    .from("vw_whitelabel_query_details")
    .select("id, query_id, traveler_name, travel_country_names")
    .eq("dmc_id", resolvedDmcId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (term) {
    const safe = term.replace(/[*%_]/g, "");
    q = q.or(`query_id.ilike.*${safe}*,traveler_name.ilike.*${safe}*`);
  }

  const { data, error } = await q;
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function deleteCrmQuery(queryId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { error } = await supabase
    .from("whitelabel_queries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", queryId)
    .eq("dmc_id", user.dmc.id);

  if (error) return { error: error.message };

  return { success: true };
}

export async function getQueryDetails(queryId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_whitelabel_query_details")
    .select("*")
    .eq("id", queryId)
    .is("deleted_at", null)
    .single();

  if (error) return { error: error.message };

  return { data };
}

export async function getQueries(status?: QueryStatus) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return { error: "user not found" };

  let query = supabase
    .from("vw_whitelabel_query_details")
    .select(
      "id, query_id, created_at, status, is_flagged_by_dmc, query_type, pax_details, nationality, nationality_name, travel_countries, travel_country_names, traveler_name, ta_name, services, travel_date, duration,ta_category, dmc_pin_count, updated_at"
    )
    .eq("dmc_id", user.dmc.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;

  if (error) return { error: error.message };

  return { data: data ?? [] };
}

export async function updateCrmQueryFlagMark(queryId: string, flagMark: boolean) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_queries")
    .update({
      is_flagged_by_dmc: flagMark,
      updated_at: new Date().toISOString(),
    })
    .eq("id", queryId)
    .select()
    .single();

  if (error) return { error: error.message };

  return { data };
}

export async function updateCrmQueryStatus(queryId: string, status: QueryStatus) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_queries")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", queryId)
    .select()
    .single();

  if (error) return { error: error.message };

  return { data };
}

// ============= MESSAGE FUNCTIONS =============

export async function getQueryMessages(queryId: string): Promise<IQueryMessage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_query_messages")
    .select(
      `id, created_at, updated_at, role, text, files, edited, query_id,
       created_by:profile!whitelabel_query_messages_created_by_fkey(user_id, name),
       pinned:whitelabel_pinned_messages!message_id(id, role)`
    )
    .eq("query_id", queryId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching query messages:", error);
    return [];
  }

  // Transform the data to match IQueryMessage type
  const messages = (data || []).map((msg: any) => {
    // Filter pinned messages to only show DMC role pins
    const dmcPins = Array.isArray(msg.pinned) ? msg.pinned.filter((pin: any) => pin.role === "dmc") : [];

    return {
      id: msg.id,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      role: msg.role,
      text: msg.text,
      files: msg.files || [],
      edited: msg.edited,
      query_id: msg.query_id,
      created_by: Array.isArray(msg.created_by) ? msg.created_by[0] : msg.created_by,
      is_pinned: dmcPins.length > 0,
    };
  });

  return messages as IQueryMessage[];
}

export async function sendQueryMessage(queryId: string, text: string, files?: FileAttachment[]) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { error: "User not authenticated" };
  }

  const { data, error } = await supabase
    .from("whitelabel_query_messages")
    .insert({
      query_id: queryId,
      text,
      role: "dmc" as QueryRoles,
      files: files || [],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error sending query message:", error);
    return { error: error.message };
  }

  return { data: data as IQueryMessage };
}

export async function createSystemQueryMessage(queryId: string, text: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rategen_query_messages")
    .insert({
      query_id: queryId,
      text,
      role: "system" as QueryRoles,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating system query message:", error);
    return { error: error.message };
  }

  return { data: data as IQueryMessage };
}

export async function getQueryFileAttachments(queryId: string): Promise<{
  agentFiles: FileAttachment[];
  dmcFiles: FileAttachment[];
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_query_messages")
    .select("role, files")
    .eq("query_id", queryId)
    .in("role", ["agent", "dmc"]);

  if (error || !data) return { agentFiles: [], dmcFiles: [] };

  const agentFiles: FileAttachment[] = [];
  const dmcFiles: FileAttachment[] = [];

  for (const msg of data) {
    const files = (msg.files || []) as FileAttachment[];
    if (msg.role === "agent") agentFiles.push(...files);
    else if (msg.role === "dmc") dmcFiles.push(...files);
  }

  return { agentFiles, dmcFiles };
}

// ============= PINNED MESSAGES FUNCTIONS =============

export async function pinMessage(messageId: string, queryId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_pinned_messages")
    .insert({
      message_id: messageId,
      query_id: queryId,
      role: "dmc",
    })
    .select()
    .single();

  if (error) {
    console.error("Error pinning message:", error);
    return { error: error.message };
  }

  await supabase.from("whitelabel_queries").update({ updated_at: new Date().toISOString() }).eq("id", queryId);

  return { data };
}

export async function unpinMessage(messageId: string, queryId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("whitelabel_pinned_messages")
    .delete()
    .eq("message_id", messageId)
    .eq("query_id", queryId)
    .eq("role", "dmc");

  if (error) {
    console.error("Error unpinning message:", error);
    return { error: error.message };
  }
  await supabase.from("whitelabel_queries").update({ updated_at: new Date().toISOString() }).eq("id", queryId);

  return { success: true };
}

/**
 * TODO: Implement "seen" feature later
 * Mark messages as read (for unread count tracking)
 * Note: You may need to add a 'read_at' or 'is_read' column to track this
 */
// export async function markQueryMessagesAsRead(queryId: string, messageIds: string[]) {
//   const supabase = await createClient();
//
//   // This assumes you add an 'is_read' boolean column to the table
//   const { error } = await supabase
//     .from("rategen_query_messages")
//     .update({ is_read: true })
//     .in("id", messageIds)
//     .eq("query_id", queryId);
//
//   if (error) {
//     console.error("Error marking query messages as read:", error);
//     return { error: error.message };
//   }
//
//   return { success: true };
// }

/**
 * TODO: Implement "seen" feature later
 * Get unread message count for a specific query
 */
// export async function getQueryUnreadCount(queryId: string): Promise<number> {
//   const supabase = await createClient();
//
//   const { count, error } = await supabase
//     .from("rategen_query_messages")
//     .select("*", { count: "exact", head: true })
//     .eq("query_id", queryId)
//     .eq("role", "agent")
//     .eq("is_read", false);
//
//   if (error) {
//     console.error("Error fetching unread count:", error);
//     return 0;
//   }
//
//   return count || 0;
// }

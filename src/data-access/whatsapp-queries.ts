"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "./auth";
import type { WhatsAppGroupRow, WhatsAppGroupWithQuery, PeriskopeConnectionRow } from "@/types/whatsapp";
import type { GroupStatus } from "@/lib/periskope/types";

export async function createWhatsAppGroup(
  periscopeChatId: string,
  queryId: string | null,
  dmcId: string,
  groupName: string,
  participantPhones: string[],
  labelIds: string[] = []
): Promise<{ data: WhatsAppGroupRow } | { error: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("whatsapp_groups")
    .insert({
      periskope_chat_id: periscopeChatId,
      query_id: queryId || null,
      dmc_id: dmcId,
      group_name: groupName,
      participant_phones: participantPhones,
      label_ids: labelIds,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as WhatsAppGroupRow };
}

export async function getWhatsAppGroupByQueryId(
  queryId: string
): Promise<{ data: WhatsAppGroupRow | null } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whatsapp_groups")
    .select("*")
    .eq("query_id", queryId)
    .single();

  if (error && error.code !== "PGRST116") return { error: error.message };
  return { data: data as WhatsAppGroupRow | null };
}

export async function getWhatsAppGroupByChatId(
  chatId: string
): Promise<{ data: WhatsAppGroupRow | null } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whatsapp_groups")
    .select("*")
    .eq("periskope_chat_id", chatId)
    .single();

  if (error && error.code !== "PGRST116") return { error: error.message };
  return { data: data as WhatsAppGroupRow | null };
}

export async function updateWhatsAppGroupStatus(
  groupId: string,
  status: GroupStatus
): Promise<{ data: WhatsAppGroupRow } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whatsapp_groups")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", groupId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as WhatsAppGroupRow };
}

export async function updateWhatsAppGroupParticipants(
  groupId: string,
  phones: string[]
): Promise<{ data: WhatsAppGroupRow } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whatsapp_groups")
    .update({ participant_phones: phones, updated_at: new Date().toISOString() })
    .eq("id", groupId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as WhatsAppGroupRow };
}

export async function updateWhatsAppGroupInviteLink(
  groupId: string,
  inviteLink: string
): Promise<{ data: WhatsAppGroupRow } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whatsapp_groups")
    .update({ invite_link: inviteLink, updated_at: new Date().toISOString() })
    .eq("id", groupId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as WhatsAppGroupRow };
}

export async function listWhatsAppGroupsForDmc(): Promise<
  { data: WhatsAppGroupWithQuery[] } | { error: string }
> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: member } = await supabase
    .from("dmc_team_members")
    .select("dmc_id")
    .eq("user_id", user.id)
    .single();

  if (!member?.dmc_id) return { error: "DMC not found" };

  const { data, error } = await supabase
    .from("whatsapp_groups")
    .select(`
      *,
      whitelabel_queries (
        query_id,
        ta_id,
        traveler_name
      )
    `)
    .eq("dmc_id", member.dmc_id)
    .order("updated_at", { ascending: false });

  if (error) return { error: error.message };

  const taIds = [...new Set((data ?? []).map((r) => (r as any).whitelabel_queries?.ta_id).filter(Boolean))];
  let taNameMap: Record<string, string> = {};
  if (taIds.length > 0) {
    const { data: taRows } = await supabase
      .from("vw_whitelabel_ta_details")
      .select("ta_id, name")
      .in("ta_id", taIds);
    taNameMap = Object.fromEntries((taRows ?? []).map((t: any) => [t.ta_id, t.name]));
  }

  const groups = (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = (row as any).whitelabel_queries;
    return {
      ...row,
      whitelabel_queries: undefined,
      query_display_id: q?.query_id ?? "",
      ta_name: q?.ta_id ? (taNameMap[q.ta_id] ?? "") : "",
      traveler_name: q?.traveler_name ?? "",
      destination: "",
    } as WhatsAppGroupWithQuery;
  });

  return { data: groups };
}

// ─── Periskope connection per DMC ───────────────────────────────────────────

async function getDmcIdForCurrentUser(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("dmc_team_members")
    .select("dmc_id")
    .eq("user_id", user.id)
    .single();
  return data?.dmc_id ?? null;
}

export async function getPeriskopeConnection(): Promise<
  { data: PeriskopeConnectionRow | null } | { error: string }
> {
  const dmcId = await getDmcIdForCurrentUser();
  if (!dmcId) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dmc_periskope_connections")
    .select("*")
    .eq("dmc_id", dmcId)
    .single();

  if (error && error.code !== "PGRST116") return { error: error.message };
  return { data: data as PeriskopeConnectionRow | null };
}

export async function savePeriskopeConnection(
  apiKey: string,
  phoneId: string
): Promise<{ data: PeriskopeConnectionRow } | { error: string }> {
  const dmcId = await getDmcIdForCurrentUser();
  if (!dmcId) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dmc_periskope_connections")
    .upsert(
      {
        dmc_id: dmcId,
        api_key: apiKey,
        phone_id: phoneId,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "dmc_id" }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as PeriskopeConnectionRow };
}

export async function disconnectPeriskope(): Promise<{ success: true } | { error: string }> {
  const dmcId = await getDmcIdForCurrentUser();
  if (!dmcId) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("dmc_periskope_connections")
    .delete()
    .eq("dmc_id", dmcId);

  if (error) return { error: error.message };
  return { success: true };
}

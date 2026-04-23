import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  createWhatsAppGroup,
  listWhatsAppGroupsForDmc,
} from "@/data-access/whatsapp-queries";
import { createGroup } from "@/lib/periskope/groups";
import { labelChatWithQuery } from "@/lib/periskope/labels";
import { PeriskopeAuthError, getPeriskopeClientForDmc } from "@/lib/periskope/client";

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function getDmcIdForUser(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dmc_team_members")
    .select("dmc_id")
    .eq("user_id", userId)
    .single();
  return data?.dmc_id ?? null;
}

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dmcId = await getDmcIdForUser(userId);
  if (!dmcId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { queryId, queryDisplayId, groupName, participants, options } = body;

  if (!groupName || !Array.isArray(participants)) {
    return NextResponse.json(
      { error: "groupName and participants are required" },
      { status: 400 }
    );
  }

  const normalisedParticipants: string[] = participants
    .map((p: string) => p.replace(/^\+/, "").replace(/[^0-9]/g, ""))
    .filter(Boolean);

  if (normalisedParticipants.length === 0) {
    return NextResponse.json({ error: "At least one participant is required" }, { status: 400 });
  }

  try {
    const { periskopeFetch } = await getPeriskopeClientForDmc(dmcId);
    const chat = await createGroup({ group_name: groupName, participants: normalisedParticipants, options }, periskopeFetch);

    if (queryDisplayId) {
      await labelChatWithQuery(chat.chat_id, queryDisplayId, [], periskopeFetch).catch(
        (err: Error) => console.error("Label chat failed:", err.message)
      );
    }

    const result = await createWhatsAppGroup(
      chat.chat_id,
      queryId || null,
      dmcId,
      groupName,
      normalisedParticipants
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ group: result.data, chat }, { status: 201 });
  } catch (err) {
    if (err instanceof PeriskopeAuthError) {
      return NextResponse.json({ error: err.message, reason: err.reason }, { status: err.status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await listWhatsAppGroupsForDmc();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ groups: result.data as unknown[] });
}

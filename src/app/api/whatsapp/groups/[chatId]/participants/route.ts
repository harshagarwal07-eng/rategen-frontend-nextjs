import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getWhatsAppGroupByChatId,
  updateWhatsAppGroupParticipants,
} from "@/data-access/whatsapp-queries";
import { addParticipants, removeParticipants } from "@/lib/periskope/groups";
import { PeriskopeAuthError, getPeriskopeClientForDmc } from "@/lib/periskope/client";

interface RouteParams {
  params: Promise<{ chatId: string }>;
}

async function requireAuth(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function getGroupAndClient(chatId: string) {
  const groupResult = await getWhatsAppGroupByChatId(chatId);
  const group = "data" in groupResult ? groupResult.data : null;
  const client = group?.dmc_id ? await getPeriskopeClientForDmc(group.dmc_id) : null;
  return { group, client };
}

export async function POST(req: Request, { params }: RouteParams) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await params;
  const { participants, force_add_participants } = await req.json();

  if (!Array.isArray(participants) || participants.length === 0) {
    return NextResponse.json({ error: "participants array required" }, { status: 400 });
  }

  try {
    const { group, client } = await getGroupAndClient(chatId);

    // Update DB first — fast, what the UI reads from.
    if (group) {
      const merged = Array.from(new Set([...group.participant_phones, ...participants]));
      await updateWhatsAppGroupParticipants(group.id, merged);
    }

    // Fire Periskope call in background — don't block response.
    if (client) {
      addParticipants(chatId, { participants, force_add_participants }, client.periskopeFetch).catch((err: unknown) => {
        console.warn("[whatsapp] background addParticipants failed:", err instanceof Error ? err.message : err);
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof PeriskopeAuthError) {
      return NextResponse.json({ error: err.message, reason: err.reason }, { status: err.status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await params;
  const { participants } = await req.json();

  if (!Array.isArray(participants) || participants.length === 0) {
    return NextResponse.json({ error: "participants array required" }, { status: 400 });
  }

  try {
    const { group, client } = await getGroupAndClient(chatId);

    // Update DB first — this is fast and what the UI reads from.
    if (group) {
      const remaining = group.participant_phones.filter((p: string) => !participants.includes(p));
      await updateWhatsAppGroupParticipants(group.id, remaining);
    }

    // Fire Periskope call in background — don't await, don't block response.
    if (client) {
      removeParticipants(chatId, participants, client.periskopeFetch).catch((err: unknown) => {
        console.warn("[whatsapp] background removeParticipants failed:", err instanceof Error ? err.message : err);
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof PeriskopeAuthError) {
      return NextResponse.json({ error: err.message, reason: err.reason }, { status: err.status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getWhatsAppGroupByChatId } from "@/data-access/whatsapp-queries";
import { promoteToAdmin, demoteAdmin } from "@/lib/periskope/groups";
import { PeriskopeAuthError, getPeriskopeClientForDmc } from "@/lib/periskope/client";

interface RouteParams {
  params: Promise<{ chatId: string }>;
}

async function requireAuth(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(req: Request, { params }: RouteParams) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await params;
  const { participants } = await req.json();

  if (!Array.isArray(participants) || participants.length === 0) {
    return NextResponse.json({ error: "participants array required" }, { status: 400 });
  }

  const groupResult = await getWhatsAppGroupByChatId(chatId);
  const dmcId = "data" in groupResult ? groupResult.data?.dmc_id : null;
  if (!dmcId) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  const { periskopeFetch } = await getPeriskopeClientForDmc(dmcId);

  // Fire in background — promote/demote can be slow on Periskope's end
  promoteToAdmin(chatId, participants, periskopeFetch).catch((err: unknown) => {
    console.warn("[whatsapp] background promoteToAdmin failed:", err instanceof Error ? err.message : err);
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await params;
  const { participants } = await req.json();

  if (!Array.isArray(participants) || participants.length === 0) {
    return NextResponse.json({ error: "participants array required" }, { status: 400 });
  }

  const groupResult = await getWhatsAppGroupByChatId(chatId);
  const dmcId = "data" in groupResult ? groupResult.data?.dmc_id : null;
  if (!dmcId) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  const { periskopeFetch } = await getPeriskopeClientForDmc(dmcId);

  demoteAdmin(chatId, participants, periskopeFetch).catch((err: unknown) => {
    console.warn("[whatsapp] background demoteAdmin failed:", err instanceof Error ? err.message : err);
  });
  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getWhatsAppGroupByChatId } from "@/data-access/whatsapp-queries";
import { demoteAdmin } from "@/lib/periskope/groups";
import { getPeriskopeClientForDmc } from "@/lib/periskope/client";

async function requireAuth(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await params;
  const body = await req.json();
  const participants: string[] = body.participants ?? [];

  if (participants.length === 0) {
    return NextResponse.json({ error: "participants is required" }, { status: 400 });
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

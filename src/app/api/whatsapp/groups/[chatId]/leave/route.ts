import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getWhatsAppGroupByChatId, updateWhatsAppGroupStatus } from "@/data-access/whatsapp-queries";
import { leaveGroup } from "@/lib/periskope/groups";
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

  try {
    const groupResult = await getWhatsAppGroupByChatId(chatId);
    const dmcId = "data" in groupResult ? groupResult.data?.dmc_id : null;
    if (!dmcId) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    const { periskopeFetch } = await getPeriskopeClientForDmc(dmcId);

    await leaveGroup(chatId, periskopeFetch);

    if ("data" in groupResult && groupResult.data?.id) {
      await updateWhatsAppGroupStatus(groupResult.data.id, "completed");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof PeriskopeAuthError) {
      return NextResponse.json({ error: err.message, reason: err.reason }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to leave group" },
      { status: 500 }
    );
  }
}

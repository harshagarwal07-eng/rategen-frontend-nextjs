import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getWhatsAppGroupByChatId } from "@/data-access/whatsapp-queries";
import { generateInviteLink } from "@/lib/periskope/groups";
import { PeriskopeAuthError, PeriskopeApiError, getPeriskopeClientForDmc } from "@/lib/periskope/client";

async function requireAuth(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await params;

  try {
    const groupResult = await getWhatsAppGroupByChatId(chatId);
    const dmcId = "data" in groupResult ? groupResult.data?.dmc_id : null;
    if (!dmcId) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    const { periskopeFetch } = await getPeriskopeClientForDmc(dmcId);

    const inviteLink = await generateInviteLink(chatId, periskopeFetch);
    return NextResponse.json({ invite_link: inviteLink });
  } catch (err) {
    if (err instanceof PeriskopeAuthError) {
      return NextResponse.json({ error: err.message, reason: err.reason }, { status: err.status });
    }
    if (err instanceof PeriskopeApiError) {
      return NextResponse.json({ error: err.message, reason: err.reason }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate invite link" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getWhatsAppGroupByChatId } from "@/data-access/whatsapp-queries";
import { sendMessage, listChatMessages } from "@/lib/periskope/messages";
import { PeriskopeAuthError, getPeriskopeClientForDmc } from "@/lib/periskope/client";

async function requireAuth(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(req: Request) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { chatId, message, media, replyTo } = body;
  if (!chatId) {
    return NextResponse.json({ error: "chatId is required" }, { status: 400 });
  }
  if (!message && !media) {
    return NextResponse.json({ error: "message or media is required" }, { status: 400 });
  }

  try {
    const groupResult = await getWhatsAppGroupByChatId(chatId);
    const dmcId = "data" in groupResult ? groupResult.data?.dmc_id : null;
    if (!dmcId) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    const { periskopeFetch } = await getPeriskopeClientForDmc(dmcId);

    const result = await sendMessage({ chat_id: chatId, message, media, reply_to: replyTo }, periskopeFetch);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof PeriskopeAuthError) {
      return NextResponse.json({ error: err.message, reason: err.reason }, { status: err.status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId");
  const offset = searchParams.get("offset");
  const limit = searchParams.get("limit");

  if (!chatId) return NextResponse.json({ error: "chatId required" }, { status: 400 });

  try {
    const groupResult = await getWhatsAppGroupByChatId(chatId);
    const dmcId = "data" in groupResult ? groupResult.data?.dmc_id : null;
    if (!dmcId) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    const { periskopeFetch } = await getPeriskopeClientForDmc(dmcId);

    const result = await listChatMessages(
      chatId,
      {
        offset: offset ? parseInt(offset, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
      periskopeFetch
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PeriskopeAuthError) {
      return NextResponse.json({ error: err.message, reason: err.reason }, { status: err.status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

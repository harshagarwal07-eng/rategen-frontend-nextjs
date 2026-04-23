import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  reactToMessage,
  deleteMessage,
  forwardMessage,
  pinMessage,
} from "@/lib/periskope/messages";
import { PeriskopeAuthError, PeriskopeApiError, getPeriskopeClientForDmc } from "@/lib/periskope/client";

async function requireAuth(): Promise<string | null> {
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

function handlePeriskopeError(err: unknown) {
  if (err instanceof PeriskopeAuthError) {
    return NextResponse.json({ error: err.message, reason: err.reason }, { status: err.status });
  }
  if (err instanceof PeriskopeApiError) {
    return NextResponse.json({ error: err.message, reason: err.reason }, { status: err.status });
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Operation failed" },
    { status: 500 }
  );
}

// POST /api/whatsapp/messages/[messageId]/[action]
export async function POST(
  req: Request,
  { params }: { params: Promise<{ messageId: string; action: string }> }
) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId, action } = await params;

  const dmcId = await getDmcIdForUser(userId);
  if (!dmcId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { periskopeFetch } = await getPeriskopeClientForDmc(dmcId);

  try {
    switch (action) {
      case "react": {
        const { emoji } = await req.json();
        if (!emoji) return NextResponse.json({ error: "emoji is required" }, { status: 400 });
        await reactToMessage(messageId, emoji, periskopeFetch);
        return NextResponse.json({ success: true });
      }
      case "delete": {
        await deleteMessage(messageId, periskopeFetch);
        return NextResponse.json({ success: true });
      }
      case "forward": {
        const { chat_id } = await req.json();
        if (!chat_id) return NextResponse.json({ error: "chat_id is required" }, { status: 400 });
        await forwardMessage(messageId, chat_id, periskopeFetch);
        return NextResponse.json({ success: true });
      }
      case "pin": {
        await pinMessage(messageId, periskopeFetch);
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    return handlePeriskopeError(err);
  }
}

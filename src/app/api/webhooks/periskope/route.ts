import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { PeriskopeWebhookEvent } from "@/lib/periskope/types";

export async function POST(req: Request) {
  let event: PeriskopeWebhookEvent;

  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!event?.org_id || !event?.integration_name) {
    return NextResponse.json(
      { error: "Missing org_id or integration_name" },
      { status: 400 }
    );
  }

  const supabase = await createClient(true);
  const { data: connection } = await supabase
    .from("dmc_periskope_connections")
    .select("dmc_id")
    .eq("org_id", event.org_id)
    .single();

  if (!connection) {
    return NextResponse.json(
      { error: "Unknown org_id" },
      { status: 403 }
    );
  }

  const dmcId = connection.dmc_id;

  switch (event.integration_name) {
    case "message.created":
      await handleMessageCreated(dmcId, event);
      break;

    case "chat.created":
      await handleChatCreated(dmcId, event);
      break;

    case "phone.disconnected":
      console.warn(
        `[Periskope Webhook] Phone disconnected for DMC ${dmcId}`,
        event.data
      );
      break;

    default:
      console.log(
        `[Periskope Webhook] Unhandled event: ${event.integration_name}`,
        { dmcId }
      );
  }

  return NextResponse.json({ received: true });
}

async function handleMessageCreated(
  dmcId: string,
  event: PeriskopeWebhookEvent
): Promise<void> {
  console.log(`[Periskope Webhook] New message for DMC ${dmcId}:`, {
    chatId: event.data?.chat_id,
    messageId: event.data?.message_id,
  });
}

async function handleChatCreated(
  dmcId: string,
  event: PeriskopeWebhookEvent
): Promise<void> {
  console.log(`[Periskope Webhook] New chat created for DMC ${dmcId}:`, {
    chatId: event.data?.chat_id,
    chatName: event.data?.chat_name,
  });
}

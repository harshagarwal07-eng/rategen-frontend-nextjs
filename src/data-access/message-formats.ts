import { createClient } from "@/utils/supabase/client";

export interface MessageFormat {
  id: string;
  message_id: string;
  whatsapp: string;
  email: string;
  pdf: string;
  created_at: string;
  updated_at: string;
}

const supabase = createClient();

/**
 * Get formatted message content by message ID
 * Returns null if not found
 */
export async function getMessageFormat(messageId: string): Promise<MessageFormat | null> {
  const { data, error } = await supabase
    .from("travel_agent_message_formats")
    .select("*")
    .eq("message_id", messageId)
    .maybeSingle();

  if (error) {
    console.error("[MessageFormats] Error getting format:", error);
    return null;
  }

  return data;
}

/**
 * Save formatted message content
 * Uses upsert to handle both insert and update
 */
export async function saveMessageFormat(
  messageId: string,
  formats: { whatsapp: string; email: string; pdf: string }
): Promise<MessageFormat | null> {
  const { data, error } = await supabase
    .from("travel_agent_message_formats")
    .upsert(
      {
        message_id: messageId,
        whatsapp: formats.whatsapp,
        email: formats.email,
        pdf: formats.pdf,
      },
      { onConflict: "message_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[MessageFormats] Error saving format:", error);
    return null;
  }

  return data;
}

/**
 * Delete formatted message content
 */
export async function deleteMessageFormat(messageId: string): Promise<boolean> {
  const { error } = await supabase
    .from("travel_agent_message_formats")
    .delete()
    .eq("message_id", messageId);

  if (error) {
    console.error("[MessageFormats] Error deleting format:", error);
    return false;
  }

  return true;
}

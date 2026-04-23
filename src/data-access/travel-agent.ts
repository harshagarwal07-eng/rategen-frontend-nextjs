import { createClient } from "@/utils/supabase/client";
import type { TravelAgentChat, TravelAgentMessage, TokenUsageHistory } from "@/types/chat";
import type { AgentStep } from "@/types/agent";
import type { MCPCall } from "@/types/mcp";
import { isUuid } from "@/lib/utils";

const supabase = createClient();

// ===== Chat Operations =====

export async function createChat(dmcId: string, title: string): Promise<TravelAgentChat | null> {
  const { data, error } = await supabase
    .from("travel_agent_chats")
    .insert({
      dmc_id: dmcId,
      title,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating chat:", error);
    return null;
  }

  return data;
}

/**
 * Create a new AI chat linked to a CRM query
 * Enforces 1:1 relationship (one AI chat per query)
 */
export async function createChatWithQuery(
  dmcId: string,
  title: string,
  queryId: string
): Promise<TravelAgentChat | null> {
  const { data, error } = await supabase
    .from("travel_agent_chats")
    .insert({
      dmc_id: dmcId,
      title,
      status: "active",
      query_id: queryId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating chat with query:", error);
    return null;
  }

  return data;
}

/**
 * Get AI chat linked to a specific CRM query
 * Returns null if no AI chat exists for the query
 */
export async function getAIChatByQueryId(queryId: string): Promise<TravelAgentChat | null> {
  const { data, error } = await supabase
    .from("travel_agent_chats")
    .select("*")
    .eq("query_id", queryId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("Error getting AI chat by query ID:", error);
    return null;
  }

  return data;
}

export async function getChat(chatId: string): Promise<TravelAgentChat | null> {
  const { data, error } = await supabase.from("travel_agent_chats").select("*").eq("id", chatId).single();

  if (error) {
    console.error("Error getting chat:", error);
    return null;
  }

  return data;
}

export async function getChatsByDMC(dmcId: string, isPlayground: boolean = false): Promise<TravelAgentChat[]> {
  let query = supabase.from("travel_agent_chats").select("*").eq("dmc_id", dmcId).is("deleted_at", null);

  // Filter for playground chats (no query_id) if requested
  if (isPlayground) {
    query = query.is("query_id", null);
  }

  const { data, error } = await query.order("last_message_at", { ascending: false });

  if (error) {
    console.error("Error getting chats:", error);
    return [];
  }

  return data || [];
}

export async function togglePinChat(chatId: string, pinned: boolean): Promise<boolean> {
  const { error } = await supabase.from("travel_agent_chats").update({ pinned }).eq("id", chatId);

  if (error) {
    console.error("Error toggling pin:", error);
    return false;
  }

  return true;
}

export async function deleteChat(chatId: string): Promise<boolean> {
  const { error } = await supabase
    .from("travel_agent_chats")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", chatId);

  if (error) {
    console.error("Error deleting chat:", error);
    return false;
  }

  return true;
}

export async function updateChatStatus(chatId: string, status: "active" | "completed" | "failed"): Promise<boolean> {
  const { error } = await supabase.from("travel_agent_chats").update({ status }).eq("id", chatId);

  if (error) {
    console.error("Error updating chat status:", error);
    return false;
  }

  return true;
}

export async function updateChatTitle(chatId: string, title: string): Promise<boolean> {
  const { error } = await supabase.from("travel_agent_chats").update({ title }).eq("id", chatId);

  if (error) {
    console.error("Error updating chat title:", error);
    return false;
  }

  return true;
}

export async function updateChatState(chatId: string, agentState: Record<string, any>): Promise<boolean> {
  const { error } = await supabase.from("travel_agent_chats").update({ agent_state: agentState }).eq("id", chatId);

  if (error) {
    console.error("Error updating chat state:", error);
    return false;
  }

  return true;
}

export async function incrementChatTokens(chatId: string, tokens: number): Promise<boolean> {
  const { error } = await supabase.rpc("increment_chat_tokens", {
    chat_id: chatId,
    token_count: tokens,
  });

  if (error) {
    // If RPC doesn't exist, fall back to manual update
    const chat = await getChat(chatId);
    if (chat) {
      const { error: updateError } = await supabase
        .from("travel_agent_chats")
        .update({ total_tokens: (chat.total_tokens || 0) + tokens })
        .eq("id", chatId);

      if (updateError) {
        console.error("Error incrementing tokens:", updateError);
        return false;
      }
    }
  }

  return true;
}

// ===== Message Operations =====

export async function createMessage(
  message: Omit<TravelAgentMessage, "id" | "created_at">
): Promise<TravelAgentMessage | null> {
  console.log("[createMessage] Inserting message:", {
    role: message.role,
    version: message.version,
    parent_message_id: message.parent_message_id,
    chat_id: message.chat_id,
  });

  const { data, error } = await supabase.from("travel_agent_messages").insert(message).select().single();

  if (error) {
    console.error("[createMessage] Error creating message:", error);
    return null;
  }

  console.log("[createMessage] Message created successfully:", {
    id: data.id,
    version: data.version,
    parent_message_id: data.parent_message_id,
  });

  // Update last_message_at for the chat
  await supabase
    .from("travel_agent_chats")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", message.chat_id);

  return data;
}

export async function getMessageById(messageId: string): Promise<TravelAgentMessage | null> {
  const { data, error } = await supabase.from("travel_agent_messages").select("*").eq("id", messageId).maybeSingle();

  if (error) {
    console.error("Error getting message by id:", error);
    return null;
  }

  return data;
}

export async function getMessages(chatId: string): Promise<TravelAgentMessage[]> {
  if (!chatId || !isUuid(chatId)) return [];

  const { data, error } = await supabase
    .from("travel_agent_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error getting messages:", error);
    return [];
  }

  return data || [];
}

export async function getChatMetadata(chatId: string): Promise<Pick<TravelAgentChat, "title"> | null> {
  if (!chatId || !isUuid(chatId)) return null;

  const { data, error } = await supabase.from("travel_agent_chats").select("title").eq("id", chatId).single();

  if (error) {
    console.error("Error getting chat metadata:", error);
    return null;
  }

  return data || null;
}

/**
 * Get messages for conversation history - only latest version of each message
 *
 * This is used for AI context to avoid duplicate messages from regeneration.
 * For each user message, we include it once.
 * For each assistant response, we only include the latest version.
 */
export async function getMessagesForConversation(chatId: string): Promise<TravelAgentMessage[]> {
  const { data, error } = await supabase
    .from("travel_agent_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error getting messages for conversation:", error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Filter to only include latest version of each message
  // User messages: include all (they don't have versions)
  // Assistant messages: only include the latest version for each parent_message_id
  const latestVersions = new Map<string, TravelAgentMessage>();
  const userMessages: TravelAgentMessage[] = [];

  for (const msg of data) {
    if (msg.role === "user") {
      userMessages.push(msg);
    } else if (msg.role === "assistant" && msg.parent_message_id) {
      // For assistant messages, track the latest version for each parent
      const existing = latestVersions.get(msg.parent_message_id);
      if (!existing || (msg.version || 1) > (existing.version || 1)) {
        latestVersions.set(msg.parent_message_id, msg);
      }
    } else {
      // Assistant message without parent_message_id (legacy) - include as-is
      userMessages.push(msg);
    }
  }

  // Combine user messages with latest assistant versions, maintaining order
  const result: TravelAgentMessage[] = [];
  for (const msg of data) {
    if (msg.role === "user") {
      result.push(msg);
    } else if (msg.role === "assistant" && msg.parent_message_id) {
      // Only include if this is the latest version
      const latest = latestVersions.get(msg.parent_message_id);
      if (latest && latest.id === msg.id) {
        result.push(msg);
      }
    } else {
      // Legacy assistant message
      result.push(msg);
    }
  }

  console.log(
    `[getMessagesForConversation] Filtered ${data.length} total messages to ${result.length} (latest versions only)`
  );

  return result;
}

/**
 * Get all versions of assistant messages for a given parent (user) message
 */
export async function getMessageVersions(parentMessageId: string): Promise<TravelAgentMessage[]> {
  const { data, error } = await supabase
    .from("travel_agent_messages")
    .select("*")
    .eq("parent_message_id", parentMessageId)
    .order("version", { ascending: true });

  if (error) {
    console.error("Error getting message versions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get the latest version number for a parent message
 */
export async function getLatestVersionNumber(parentMessageId: string): Promise<number> {
  console.log("[getLatestVersionNumber] Looking for parent_message_id:", parentMessageId);

  const { data, error } = await supabase
    .from("travel_agent_messages")
    .select("version")
    .eq("parent_message_id", parentMessageId)
    .order("version", { ascending: false })
    .limit(1);

  // Don't use .single() - it throws error when no records found
  // Just check if we got any data
  if (error) {
    console.error("[getLatestVersionNumber] Error:", error);
    return 0;
  }

  if (!data || data.length === 0) {
    console.log("[getLatestVersionNumber] No existing versions found, returning 0");
    return 0;
  }

  const latestVersion = data[0].version || 0;
  console.log("[getLatestVersionNumber] Found latest version:", latestVersion);
  return latestVersion;
}

// ===== Agent Step Operations =====

export async function createStep(step: Omit<AgentStep, "id">): Promise<AgentStep | null> {
  const { data, error } = await supabase.from("agent_steps").insert(step).select().single();

  if (error) {
    console.error("Error creating step:", error);
    return null;
  }

  return data;
}

export async function updateStep(stepId: string, updates: Partial<AgentStep>): Promise<boolean> {
  const { error } = await supabase.from("agent_steps").update(updates).eq("id", stepId);

  if (error) {
    console.error("Error updating step:", error);
    return false;
  }

  return true;
}

export async function getSteps(chatId: string): Promise<AgentStep[]> {
  const { data, error } = await supabase
    .from("agent_steps")
    .select("*")
    .eq("chat_id", chatId)
    .order("started_at", { ascending: true });

  if (error) {
    console.error("Error getting steps:", error);
    return [];
  }

  return data || [];
}

export async function getStepsByMessage(messageId: string): Promise<AgentStep[]> {
  const { data, error } = await supabase
    .from("agent_steps")
    .select("*")
    .eq("message_id", messageId)
    .order("started_at", { ascending: true });

  if (error) {
    console.error("Error getting steps by message:", error);
    return [];
  }

  return data || [];
}

// ===== MCP Call Operations =====

export async function createMCPCall(call: Omit<MCPCall, "id" | "created_at">): Promise<MCPCall | null> {
  const { data, error } = await supabase.from("mcp_calls").insert(call).select().single();

  if (error) {
    console.error("Error creating MCP call:", error);
    return null;
  }

  return data;
}

export async function getMCPCalls(chatId: string): Promise<MCPCall[]> {
  const { data, error } = await supabase
    .from("mcp_calls")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error getting MCP calls:", error);
    return [];
  }

  return data || [];
}

export async function getMCPCallsByStep(stepId: string): Promise<MCPCall[]> {
  const { data, error } = await supabase
    .from("mcp_calls")
    .select("*")
    .eq("step_id", stepId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error getting MCP calls by step:", error);
    return [];
  }

  return data || [];
}

// ===== Pinned Messages Operations =====

export interface PinnedMessage {
  id: string;
  chat_id: string;
  message_id: string;
  created_at: string;
}

export async function pinMessage(chatId: string, messageId: string): Promise<boolean> {
  const { error } = await supabase.from("pinned_messages").insert({
    chat_id: chatId,
    message_id: messageId,
  });

  if (error) {
    console.error("Error pinning message:", error);
    return false;
  }

  return true;
}

export async function unpinMessage(messageId: string): Promise<boolean> {
  const { error } = await supabase.from("pinned_messages").delete().eq("message_id", messageId);

  if (error) {
    console.error("Error unpinning message:", error);
    return false;
  }

  return true;
}

export async function getPinnedMessages(chatId: string): Promise<string[]> {
  if (!chatId || !isUuid(chatId)) return [];

  const { data, error } = await supabase
    .from("pinned_messages")
    .select("message_id")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error getting pinned messages:", error);
    return [];
  }

  return (data || []).map((item) => item.message_id);
}

// ===== Message Deletion Operations =====

/**
 * Delete all messages after (and including) a specific message in a chat
 * Used when editing a message to remove subsequent conversation
 */
export async function deleteMessagesAfter(chatId: string, messageId: string): Promise<boolean> {
  console.log("[deleteMessagesAfter] Deleting messages after:", messageId);

  // First, get the message to find its timestamp
  const { data: targetMessage, error: getError } = await supabase
    .from("travel_agent_messages")
    .select("created_at")
    .eq("id", messageId)
    .single();

  if (getError || !targetMessage) {
    console.error("[deleteMessagesAfter] Error getting target message:", getError);
    return false;
  }

  console.log("[deleteMessagesAfter] Target message created_at:", targetMessage.created_at);

  // Delete all messages created after this timestamp in the same chat
  const { error: deleteError, count } = await supabase
    .from("travel_agent_messages")
    .delete()
    .eq("chat_id", chatId)
    .gte("created_at", targetMessage.created_at);

  if (deleteError) {
    console.error("[deleteMessagesAfter] Error deleting messages:", deleteError);
    return false;
  }

  console.log(`[deleteMessagesAfter] Deleted ${count} messages`);
  return true;
}

// ===== Token Usage History Operations =====

/**
 * Save token usage to permanent history
 * This survives message deletion to maintain accurate total token count
 */
export async function saveTokenUsage(
  chatId: string,
  userMessageText: string,
  tokensUsed: number,
  modelUsed?: string
): Promise<boolean> {
  console.log("[saveTokenUsage] Saving token usage:", {
    chatId,
    tokensUsed,
    messagePreview: userMessageText.substring(0, 50),
  });

  const { error } = await supabase.from("token_usage_history").insert({
    chat_id: chatId,
    user_message_text: userMessageText,
    tokens_used: tokensUsed,
    model_used: modelUsed,
  });

  if (error) {
    console.error("[saveTokenUsage] Error saving token usage:", error);
    return false;
  }

  console.log("[saveTokenUsage] Token usage saved successfully");
  return true;
}

/**
 * Get token usage history for a chat
 */
export async function getTokenUsageHistory(chatId: string): Promise<TokenUsageHistory[]> {
  const { data, error } = await supabase
    .from("token_usage_history")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getTokenUsageHistory] Error getting token usage history:", error);
    return [];
  }

  return data || [];
}

/**
 * Get total tokens used for a chat (from history, not from messages)
 */
export async function getTotalTokensFromHistory(chatId: string): Promise<number> {
  const { data, error } = await supabase.from("token_usage_history").select("tokens_used").eq("chat_id", chatId);

  if (error) {
    console.error("[getTotalTokensFromHistory] Error:", error);
    return 0;
  }

  return data.reduce((sum, record) => sum + (record.tokens_used || 0), 0);
}

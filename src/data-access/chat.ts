"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "./auth";
import { UIMessage } from "ai";
import { ChatWithVersions } from "@/types/chat";

export const createChatWithMessage = async (message: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  if (!message.trim()) return { error: "Message is required" };

  // Create chat with pending message stored temporarily
  const { data: chatData, error: chatError } = await supabase
    .from("chats")
    .insert({
      dmc_id: user.dmc.id,
      title: "New Query",
      pending_message: message, // Store message temporarily in chat record
    })
    .select("id")
    .single();

  if (chatError) return { error: chatError.message };

  return { data: { chat_id: chatData.id, dmc_id: user.dmc.id } };
};

export const clearPendingMessage = async (chatId: string) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("chats")
    .update({ pending_message: null })
    .eq("id", chatId);

  return !error;
};

export const createChatOnly = async () => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  // Create only the chat, no message yet
  const { data: chatData, error: chatError } = await supabase
    .from("chats")
    .insert({
      dmc_id: user.dmc.id,
      title: "New Query",
    })
    .select("id")
    .single();

  if (chatError) return { error: chatError.message };

  return { data: { chat_id: chatData.id, dmc_id: user.dmc.id } };
};

export const getMessages = async (chatId: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) return [];

  return data.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: [{ type: "text", text: msg.content }],
    createdAt: msg.created_at,
  })) as UIMessage[];
};

export const saveMessage = async (
  chatId: string,
  content: string,
  role: "user" | "assistant"
) => {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return { error: "User not found" };

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      chat_id: chatId,
      content,
      role,
      dmc_id: user.dmc.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { data };
};

export const getChat = async (chatId: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chats")
    .select(
      "title, active_rate_version, total_rate_versions, active_quote_version, total_quote_versions, id, pending_message"
    )
    .eq("id", chatId)
    .single();

  if (error) return null;

  return data as ChatWithVersions;
};

export const updateChatById = async (chatId: string, data: any) => {
  const supabase = await createClient();

  const { error } = await supabase.from("chats").update(data).eq("id", chatId);

  if (error) return { error: error.message };

  return { data };
};

export const getLatestChat = async () => {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("chats")
    .select("id, title, created_at")
    .eq("dmc_id", user.dmc.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;

  return data;
};

export const getAllChats = async () => {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("chats")
    .select("id, title, created_at")
    .eq("dmc_id", user.dmc.id)
    .order("created_at", { ascending: false });

  if (error) return [];

  return data;
};

export const deleteChat = async (chatId: string) => {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return { error: "User not found" };

  const { error } = await supabase
    .from("chats")
    .delete()
    .eq("id", chatId)
    .eq("dmc_id", user.dmc.id);

  if (error) return { error: error.message };

  return { success: true };
};

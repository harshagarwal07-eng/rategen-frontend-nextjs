"use server";

import { createClient } from "../utils/supabase/server";

export type Quote = {
  id: string;
  created_at: string;
  chat_id: string;
  dmc_id: string;
  version: number;
  markdown: string;
};

export async function getQuotesByVersion(
  version: number,
  chatId: string
): Promise<{ data: Quote[]; totalItems: number }> {
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("quotes")
    .select("*", { count: "exact" })
    .eq("chat_id", chatId)
    .eq("version", version)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching quotes:", error);
    throw error;
  }

  return {
    data: data || [],
    totalItems: count || 0,
  };
}

export async function getQuoteByVersion(
  version: number,
  chatId: string
): Promise<Quote | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("chat_id", chatId)
    .eq("version", version)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No data found
      return null;
    }
    console.error("Error fetching quote:", error);
    throw error;
  }

  return data;
}

"use server";

import { createClient } from "../utils/supabase/server";

export async function getRateProgress() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rate_progress")
    .select("*")
    .limit(1)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Error fetching rate progress: ${error.message}`);
    return null;
  }

  return data?.[0];
}

export async function getRatesByVersion(
  version: number,
  table: string,
  chatId: string
) {
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from(`${table}_rates`)
    .select("*", { count: "exact" })
    .eq("version", version)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Error fetching all rates: ${error.message}`);

  return { data, totalItems: count ?? 0 };
}

export async function getTotalVersions(id: string) {
  const supabase = await createClient();

  const [hotels, transfers, tours] = await Promise.all([
    supabase
      .from("hotels_rates")
      .select("version", { count: "exact" })
      .eq("chat_id", id),
    supabase
      .from("transfers_rates")
      .select("version", { count: "exact" })
      .eq("chat_id", id),
    supabase
      .from("tours_rates")
      .select("version", { count: "exact" })
      .eq("chat_id", id),
  ]);

  if (hotels.error || transfers.error || tours.error)
    throw new Error(
      `Error fetching total versions: ${
        hotels.error?.message ||
        transfers.error?.message ||
        tours.error?.message
      }`
    );

  const count = Math.max(
    hotels.count ?? 0,
    transfers.count ?? 0,
    tours.count ?? 0
  );

  return count;
}

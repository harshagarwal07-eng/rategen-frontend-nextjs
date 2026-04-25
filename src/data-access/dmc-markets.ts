"use client";

import { http } from "@/lib/api";

export interface Market {
  id: string;
  name: string;
  country_mode?: "specific" | "all";
  country_ids?: string[];
}

export interface CreateMarketPayload {
  name: string;
  country_mode: "specific" | "all";
  country_ids: string[];
}

type Result<T> = { data: T | null; error: string | null };

function unwrap<T>(raw: unknown): Result<T> {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "error" in (raw as Record<string, unknown>)) {
    const err = (raw as { error?: unknown }).error;
    if (err) return { data: null, error: String(err) };
  }
  return { data: raw as T, error: null };
}

export async function listMarkets(): Promise<Result<Market[]>> {
  const raw = await http.get<Market[]>("/api/master/markets");
  return unwrap<Market[]>(raw);
}

export async function createMarket(payload: CreateMarketPayload): Promise<Result<Market>> {
  const raw = await http.post<Market>("/api/master/markets", payload);
  return unwrap<Market>(raw);
}

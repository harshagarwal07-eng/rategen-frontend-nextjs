"use client";

import { http } from "@/lib/api";

export interface Market {
  id: string;
  name: string;
  country_mode?: "specific" | "all";
  country_ids?: string[];
  is_system?: boolean;
}

export interface MarketDetail {
  id: string;
  name: string;
  country_mode: "specific" | "all";
  status: string;
  included_country_ids: string[];
  excluded_country_ids: string[];
}

export interface CreateMarketPayload {
  name: string;
  country_mode: "specific" | "all";
  country_ids: string[];
}

export interface UpdateMarketPayload {
  name?: string;
  country_mode?: "specific" | "all";
  country_ids?: string[];
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

export async function getMarket(id: string): Promise<Result<MarketDetail>> {
  const raw = await http.get<MarketDetail>(`/api/master/markets/${id}`);
  return unwrap<MarketDetail>(raw);
}

export async function updateMarket(
  id: string,
  payload: UpdateMarketPayload
): Promise<Result<MarketDetail>> {
  const raw = await http.patch<MarketDetail>(`/api/master/markets/${id}`, payload);
  return unwrap<MarketDetail>(raw);
}

export interface Country {
  id: string;
  name: string;
}

export async function listCountries(): Promise<Result<Country[]>> {
  const raw = await http.get<Country[]>("/api/master/countries");
  return unwrap<Country[]>(raw);
}

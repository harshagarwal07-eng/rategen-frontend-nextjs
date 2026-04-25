"use client";

import axios from "axios";
import http from "@/lib/api";
import { env } from "@/lib/env";
import { createClient } from "@/utils/supabase/client";
import {
  TransferListRow,
  TransferCreateInput,
  TransferUpdateInput,
  TransferCreated,
  TransferDetail,
  TransferCountryOption,
  TransferCurrencyOption,
} from "@/types/transfers";

type Result<T> = { data: T | null; error: string | null };

function unwrap<T>(raw: unknown): Result<T> {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "error" in raw && (raw as { error?: unknown }).error) {
    return { data: null, error: String((raw as { error: unknown }).error) };
  }
  return { data: raw as T, error: null };
}

// http helper in lib/api.ts has no patch(); guides.ts has the same workaround.
async function authedAxios() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return axios.create({
    baseURL: env.API_URL,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
  });
}

function axiosErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) return e.response?.data?.message || e.message;
  if (e instanceof Error) return e.message;
  return "Request failed";
}

export async function listTransfers(): Promise<Result<TransferListRow[]>> {
  const raw = await http.get<TransferListRow[]>("/api/transfers");
  return unwrap<TransferListRow[]>(raw);
}

export async function getTransferById(id: string): Promise<Result<TransferDetail>> {
  const raw = await http.get<TransferDetail>(`/api/transfers/${id}`);
  return unwrap<TransferDetail>(raw);
}

export async function createTransfer(
  input: TransferCreateInput,
): Promise<Result<TransferCreated>> {
  const raw = await http.post<TransferCreated>("/api/transfers", input);
  return unwrap<TransferCreated>(raw);
}

export async function updateTransfer(
  id: string,
  input: TransferUpdateInput,
): Promise<Result<TransferDetail>> {
  try {
    const client = await authedAxios();
    const res = await client.patch<TransferDetail>(`/api/transfers/${id}`, input);
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function listTransferPackages(
  transferId: string,
): Promise<Result<unknown[]>> {
  const raw = await http.get<unknown[]>(`/api/transfers/${transferId}/packages`);
  return unwrap<unknown[]>(raw);
}

export async function listTransferCountries(): Promise<Result<TransferCountryOption[]>> {
  const raw = await http.get<TransferCountryOption[]>("/api/geo/countries");
  return unwrap<TransferCountryOption[]>(raw);
}

export async function listTransferCurrencies(): Promise<Result<TransferCurrencyOption[]>> {
  const raw = await http.get<TransferCurrencyOption[]>("/api/fixed-departures/meta/currencies");
  return unwrap<TransferCurrencyOption[]>(raw);
}

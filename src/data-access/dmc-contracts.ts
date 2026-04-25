"use client";

import { http } from "@/lib/api";
import { DmcContract } from "@/types/dmc-contracts";

type Result<T> = { data: T | null; error: string | null };

function unwrap<T>(raw: unknown): Result<T> {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "error" in (raw as Record<string, unknown>)) {
    const err = (raw as { error?: unknown }).error;
    if (err) return { data: null, error: String(err) };
  }
  return { data: raw as T, error: null };
}

export type CreateContractPayload = {
  name: string;
  market_id?: string;
  stay_valid_from?: string;
  stay_valid_till?: string;
  booking_valid_from?: string;
  booking_valid_till?: string;
  rate_type?: "net" | "bar";
  status?: "draft" | "active";
};

export async function listContracts(
  hotelId: string,
  includeArchived: boolean = false
): Promise<Result<DmcContract[]>> {
  // Backend's class-validator+transformer treats any non-empty string as
  // truthy when implicit-converting to boolean, so sending
  // `?includeArchived=false` would still include archived rows. Only attach
  // the param when we actually want archived rows.
  const params = includeArchived ? { includeArchived: true } : {};
  const raw = await http.get<{ data: DmcContract[]; total: number }>(
    `/api/hotels/${hotelId}/contracts`,
    params
  );
  const unwrapped = unwrap<{ data: DmcContract[]; total: number }>(raw);
  if (unwrapped.error) {
    return { data: null, error: unwrapped.error };
  }
  return { data: unwrapped.data?.data || [], error: null };
}

export async function createContract(
  hotelId: string,
  data: CreateContractPayload
): Promise<Result<DmcContract>> {
  const raw = await http.post<DmcContract>(`/api/hotels/${hotelId}/contracts`, data);
  return unwrap<DmcContract>(raw);
}

export async function updateContract(
  id: string,
  data: Partial<CreateContractPayload>
): Promise<Result<DmcContract>> {
  const raw = await http.patch<DmcContract>(`/api/contracts/${id}`, data);
  return unwrap<DmcContract>(raw);
}

export async function deleteContract(id: string): Promise<Result<void>> {
  const raw = await http.delete<void>(`/api/contracts/${id}`);
  return unwrap<void>(raw);
}

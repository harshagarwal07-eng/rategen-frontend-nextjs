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
  rate_basis?: string;
  status?: "draft" | "active";
};

export async function listContracts(
  hotelId: string,
  includeArchived: boolean = false
): Promise<Result<DmcContract[]>> {
  const raw = await http.get<DmcContract[]>(
    `/api/hotels/${hotelId}/contracts`,
    { includeArchived }
  );
  return unwrap<DmcContract[]>(raw);
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

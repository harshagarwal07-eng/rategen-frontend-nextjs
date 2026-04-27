"use client";

import { http } from "@/lib/api";
import {
  BulkReplaceResponse,
  ContractRate,
  MealPlan,
  RatesPayloadItem,
} from "@/types/contract-rates";

type Result<T> = { data: T | null; error: string | null };

function hasError(raw: unknown): string | null {
  if (
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "error" in (raw as Record<string, unknown>)
  ) {
    const err = (raw as { error?: unknown }).error;
    if (err) return String(err);
  }
  return null;
}

// GET /api/contracts/:contractId/rates → { data: ContractRate[], total: number }
// Returns the bare array. age_pricing is NOT included on this endpoint —
// callers fan out getRateDetail() to fill that in.
export async function listContractRates(
  contractId: string
): Promise<Result<ContractRate[]>> {
  const raw = await http.get<unknown>(`/api/contracts/${contractId}/rates`);
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  const wrapper = raw as { data?: ContractRate[]; total?: number };
  return { data: wrapper.data ?? [], error: null };
}

// GET /api/rates/:id → ContractRate with embedded age_pricing.
export async function getRateDetail(
  rateId: string
): Promise<Result<ContractRate>> {
  const raw = await http.get<ContractRate>(`/api/rates/${rateId}`);
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: raw as ContractRate, error: null };
}

// PUT /api/contracts/:contractId/rates — bulk diff-by-id replace.
export async function putContractRates(
  contractId: string,
  items: RatesPayloadItem[]
): Promise<Result<BulkReplaceResponse>> {
  const raw = await http.put<BulkReplaceResponse>(
    `/api/contracts/${contractId}/rates`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: raw as BulkReplaceResponse, error: null };
}

// GET /api/meal-plans → bare MealPlan[] sorted by sort_order.
export async function listMealPlans(): Promise<Result<MealPlan[]>> {
  const raw = await http.get<MealPlan[]>(`/api/meal-plans`);
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as MealPlan[]) ?? [], error: null };
}

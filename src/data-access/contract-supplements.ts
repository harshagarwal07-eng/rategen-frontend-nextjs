"use client";

import { http } from "@/lib/api";
import {
  CreateSupplementPayload,
  SupplementAgeBand,
  SupplementAgePricingRow,
  SupplementBase,
  SupplementContractTaxRow,
  SupplementDateRange,
  SupplementDetail,
  SupplementMealPlanRow,
  SupplementRoomCategoryRow,
  UpdateSupplementPayload,
} from "@/types/contract-supplements";

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

// GET /api/contracts/:contractId/supplements → { data: SupplementBase[], total }
export async function listContractSupplements(
  contractId: string,
  status: "active" | "all" = "all"
): Promise<Result<SupplementBase[]>> {
  const raw = await http.get<unknown>(
    `/api/contracts/${contractId}/supplements`,
    { status }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  const wrapper = raw as { data?: SupplementBase[]; total?: number };
  return { data: wrapper.data ?? [], error: null };
}

// GET /api/supplements/:id → SupplementDetail (with all 5 sub-tables)
export async function getSupplementDetail(
  supplementId: string
): Promise<Result<SupplementDetail>> {
  const raw = await http.get<SupplementDetail>(
    `/api/supplements/${supplementId}`
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: raw as SupplementDetail, error: null };
}

// POST /api/contracts/:contractId/supplements
export async function createSupplement(
  contractId: string,
  payload: CreateSupplementPayload
): Promise<Result<SupplementBase>> {
  const raw = await http.post<SupplementBase>(
    `/api/contracts/${contractId}/supplements`,
    payload
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: raw as SupplementBase, error: null };
}

// PATCH /api/supplements/:id
export async function updateSupplement(
  supplementId: string,
  payload: UpdateSupplementPayload
): Promise<Result<SupplementBase>> {
  const raw = await http.patch<SupplementBase>(
    `/api/supplements/${supplementId}`,
    payload
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: raw as SupplementBase, error: null };
}

// DELETE /api/supplements/:id (cascades all 5 sub-tables)
export async function deleteSupplement(
  supplementId: string
): Promise<Result<null>> {
  const raw = await http.delete<unknown>(`/api/supplements/${supplementId}`);
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: null, error: null };
}

export async function replaceSupplementDateRanges(
  supplementId: string,
  items: Array<Pick<SupplementDateRange, "range_type" | "date_from" | "date_to">>
): Promise<Result<SupplementDateRange[]>> {
  const raw = await http.put<SupplementDateRange[]>(
    `/api/supplements/${supplementId}/date-ranges`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as SupplementDateRange[]) ?? [], error: null };
}

export async function replaceSupplementMealPlans(
  supplementId: string,
  items: Array<{ meal_plan: string }>
): Promise<Result<SupplementMealPlanRow[]>> {
  const raw = await http.put<SupplementMealPlanRow[]>(
    `/api/supplements/${supplementId}/meal-plans`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as SupplementMealPlanRow[]) ?? [], error: null };
}

export async function replaceSupplementRoomCategories(
  supplementId: string,
  items: Array<{ room_category_id: string; is_mandatory?: boolean }>
): Promise<Result<SupplementRoomCategoryRow[]>> {
  const raw = await http.put<SupplementRoomCategoryRow[]>(
    `/api/supplements/${supplementId}/room-categories`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as SupplementRoomCategoryRow[]) ?? [], error: null };
}

export async function replaceSupplementTaxes(
  supplementId: string,
  items: Array<{ contract_tax_id: string; is_inclusive?: boolean }>
): Promise<Result<SupplementContractTaxRow[]>> {
  const raw = await http.put<SupplementContractTaxRow[]>(
    `/api/supplements/${supplementId}/taxes`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as SupplementContractTaxRow[]) ?? [], error: null };
}

export async function replaceSupplementAgePricing(
  supplementId: string,
  items: Array<{
    age_policy_id?: string;
    supplement_age_band_id?: string;
    is_free?: boolean;
    price?: number;
    price_type?: string;
  }>
): Promise<Result<SupplementAgePricingRow[]>> {
  const raw = await http.put<SupplementAgePricingRow[]>(
    `/api/supplements/${supplementId}/age-pricing`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as SupplementAgePricingRow[]) ?? [], error: null };
}

// PUT /api/supplements/:id/age-bands
// Replaces the supplement's custom age bands. Backend rejects when
// supplement_type === 'meal_plan'.
export async function replaceSupplementAgeBands(
  supplementId: string,
  age_bands: Array<{
    id?: string;
    label: string;
    age_from: number;
    age_to: number;
    sort_order?: number;
  }>
): Promise<Result<SupplementAgeBand[]>> {
  const raw = await http.put<SupplementAgeBand[]>(
    `/api/supplements/${supplementId}/age-bands`,
    { age_bands }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as SupplementAgeBand[]) ?? [], error: null };
}

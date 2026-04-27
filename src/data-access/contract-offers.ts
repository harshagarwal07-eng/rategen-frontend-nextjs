"use client";

import { http } from "@/lib/api";
import {
  CreateOfferPayload,
  OfferBase,
  OfferCancellationRule,
  OfferCustomRow,
  OfferDateRange,
  OfferDetail,
  OfferEarlyBirdRow,
  OfferFamilyRow,
  OfferFreeNightRow,
  OfferHoneymoonRow,
  OfferLongStayRow,
  OfferMealPlanRow,
  OfferRepeaterRow,
  OfferRoomCategoryRow,
  UpdateOfferPayload,
} from "@/types/contract-offers";

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

export async function listContractOffers(
  contractId: string,
  status: "active" | "all" = "all"
): Promise<Result<OfferBase[]>> {
  const raw = await http.get<unknown>(`/api/contracts/${contractId}/offers`, {
    status,
  });
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  const wrapper = raw as { data?: OfferBase[]; total?: number };
  return { data: wrapper.data ?? [], error: null };
}

export async function getOfferDetail(
  offerId: string
): Promise<Result<OfferDetail>> {
  const raw = await http.get<OfferDetail>(`/api/offers/${offerId}`);
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: raw as OfferDetail, error: null };
}

export async function createOffer(
  contractId: string,
  payload: CreateOfferPayload
): Promise<Result<OfferBase>> {
  const raw = await http.post<OfferBase>(
    `/api/contracts/${contractId}/offers`,
    payload
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: raw as OfferBase, error: null };
}

export async function updateOffer(
  offerId: string,
  payload: UpdateOfferPayload
): Promise<Result<OfferBase>> {
  const raw = await http.patch<OfferBase>(`/api/offers/${offerId}`, payload);
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: raw as OfferBase, error: null };
}

export async function deleteOffer(offerId: string): Promise<Result<null>> {
  const raw = await http.delete<unknown>(`/api/offers/${offerId}`);
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: null, error: null };
}

export async function replaceOfferRoomCategories(
  offerId: string,
  items: Array<{ room_category_id: string }>
): Promise<Result<OfferRoomCategoryRow[]>> {
  const raw = await http.put<OfferRoomCategoryRow[]>(
    `/api/offers/${offerId}/room-categories`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as OfferRoomCategoryRow[]) ?? [], error: null };
}

export async function replaceOfferMealPlans(
  offerId: string,
  items: Array<{ meal_plan: string }>
): Promise<Result<OfferMealPlanRow[]>> {
  const raw = await http.put<OfferMealPlanRow[]>(
    `/api/offers/${offerId}/meal-plans`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as OfferMealPlanRow[]) ?? [], error: null };
}

export async function replaceOfferDateRanges(
  offerId: string,
  date_ranges: Array<Pick<OfferDateRange, "range_type" | "date_from" | "date_to">>
): Promise<Result<OfferDateRange[]>> {
  const raw = await http.put<OfferDateRange[]>(
    `/api/offers/${offerId}/date-ranges`,
    { date_ranges }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as OfferDateRange[]) ?? [], error: null };
}

export async function replaceOfferCancellationPolicy(
  offerId: string,
  items: Array<Omit<OfferCancellationRule, "id">>
): Promise<Result<OfferCancellationRule[]>> {
  const raw = await http.put<OfferCancellationRule[]>(
    `/api/offers/${offerId}/cancellation-policy`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as OfferCancellationRule[]) ?? [], error: null };
}

export async function replaceOfferEarlyBird(
  offerId: string,
  items: Array<Omit<OfferEarlyBirdRow, "id">>
): Promise<Result<OfferEarlyBirdRow[]>> {
  const raw = await http.put<OfferEarlyBirdRow[]>(
    `/api/offers/${offerId}/early-bird`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as OfferEarlyBirdRow[]) ?? [], error: null };
}

export async function replaceOfferLongStay(
  offerId: string,
  items: Array<Omit<OfferLongStayRow, "id">>
): Promise<Result<OfferLongStayRow[]>> {
  const raw = await http.put<OfferLongStayRow[]>(
    `/api/offers/${offerId}/long-stay`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as OfferLongStayRow[]) ?? [], error: null };
}

export async function replaceOfferFreeNight(
  offerId: string,
  items: Array<Omit<OfferFreeNightRow, "id">>
): Promise<Result<OfferFreeNightRow[]>> {
  const raw = await http.put<OfferFreeNightRow[]>(
    `/api/offers/${offerId}/free-night`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as OfferFreeNightRow[]) ?? [], error: null };
}

export async function replaceOfferHoneymoon(
  offerId: string,
  items: Array<Omit<OfferHoneymoonRow, "id">>
): Promise<Result<OfferHoneymoonRow[]>> {
  const raw = await http.put<OfferHoneymoonRow[]>(
    `/api/offers/${offerId}/honeymoon`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as OfferHoneymoonRow[]) ?? [], error: null };
}

export async function replaceOfferFamily(
  offerId: string,
  items: Array<Omit<OfferFamilyRow, "id">>
): Promise<Result<OfferFamilyRow[]>> {
  const raw = await http.put<OfferFamilyRow[]>(
    `/api/offers/${offerId}/family`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as OfferFamilyRow[]) ?? [], error: null };
}

export async function replaceOfferRepeater(
  offerId: string,
  items: Array<Omit<OfferRepeaterRow, "id">>
): Promise<Result<OfferRepeaterRow[]>> {
  const raw = await http.put<OfferRepeaterRow[]>(
    `/api/offers/${offerId}/repeater`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as OfferRepeaterRow[]) ?? [], error: null };
}

export async function replaceOfferCustom(
  offerId: string,
  items: Array<Omit<OfferCustomRow, "id">>
): Promise<Result<OfferCustomRow[]>> {
  const raw = await http.put<OfferCustomRow[]>(
    `/api/offers/${offerId}/custom`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as OfferCustomRow[]) ?? [], error: null };
}

// PUT /api/offers/:id/combinations — partner ids resolved to real ids on FE.
// Backend writes symmetric pairs atomically via RPC.
export async function replaceOfferCombinations(
  offerId: string,
  combine_with_offer_ids: string[]
): Promise<Result<{ combinations: string[] }>> {
  const raw = await http.put<{ combinations: string[] }>(
    `/api/offers/${offerId}/combinations`,
    { combine_with_offer_ids }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: raw as { combinations: string[] }, error: null };
}

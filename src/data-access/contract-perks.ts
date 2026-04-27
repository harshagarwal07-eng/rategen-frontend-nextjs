"use client";

import { http } from "@/lib/api";
import {
  CreatePerkPayload,
  PerkBase,
  PerkDetail,
  PerkRoomCategoryRow,
  UpdatePerkPayload,
} from "@/types/contract-perks";

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

export interface ListPerksFilters {
  status?: "active" | "all";
  // Pass the literal string 'null' to fetch standalone perks only.
  offer_id?: string | "null";
}

export async function listContractPerks(
  contractId: string,
  filters: ListPerksFilters = {}
): Promise<Result<PerkBase[]>> {
  const params: Record<string, string> = { status: filters.status ?? "all" };
  if (filters.offer_id !== undefined) params.offer_id = filters.offer_id;
  const raw = await http.get<unknown>(
    `/api/contracts/${contractId}/perks`,
    params
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  const wrapper = raw as { data?: PerkBase[]; total?: number };
  return { data: wrapper.data ?? [], error: null };
}

export async function getPerkDetail(perkId: string): Promise<Result<PerkDetail>> {
  const raw = await http.get<PerkDetail>(`/api/perks/${perkId}`);
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: raw as PerkDetail, error: null };
}

export async function createPerk(
  contractId: string,
  payload: CreatePerkPayload
): Promise<Result<PerkBase>> {
  const raw = await http.post<PerkBase>(
    `/api/contracts/${contractId}/perks`,
    payload
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: raw as PerkBase, error: null };
}

export async function updatePerk(
  perkId: string,
  payload: UpdatePerkPayload
): Promise<Result<PerkBase>> {
  const raw = await http.patch<PerkBase>(`/api/perks/${perkId}`, payload);
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: raw as PerkBase, error: null };
}

export async function deletePerk(perkId: string): Promise<Result<null>> {
  const raw = await http.delete<unknown>(`/api/perks/${perkId}`);
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: null, error: null };
}

export async function replacePerkRoomCategories(
  perkId: string,
  items: Array<{ room_category_id: string }>
): Promise<Result<PerkRoomCategoryRow[]>> {
  const raw = await http.put<PerkRoomCategoryRow[]>(
    `/api/perks/${perkId}/room-categories`,
    { items }
  );
  const err = hasError(raw);
  if (err) return { data: null, error: err };
  return { data: (raw as PerkRoomCategoryRow[]) ?? [], error: null };
}

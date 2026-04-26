"use client";

import { http } from "@/lib/api";
import {
  AgePoliciesResponse,
  AgePolicyBand,
  ContractRoom,
  ContractSeason,
  ContractSeasonRow,
  ContractTax,
} from "@/types/contract-tab2";

type Result<T> = { data: T | null; error: string | null };

function unwrap<T>(raw: unknown): Result<T> {
  if (
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "error" in (raw as Record<string, unknown>)
  ) {
    const err = (raw as { error?: unknown }).error;
    if (err) return { data: null, error: String(err) };
  }
  return { data: raw as T, error: null };
}

// ─── Age policies ──────────────────────────────────────────────────────────
// GET/PUT shape: { rooms: AgePolicyBand[], meals: AgePolicyBand[] }

export async function getAgePolicies(
  contractId: string
): Promise<Result<AgePoliciesResponse>> {
  const raw = await http.get<AgePoliciesResponse>(
    `/api/contracts/${contractId}/age-policies`
  );
  return unwrap<AgePoliciesResponse>(raw);
}

export async function putAgePolicies(
  contractId: string,
  body: { rooms: AgePolicyBand[]; meals: AgePolicyBand[] }
): Promise<Result<AgePoliciesResponse>> {
  const raw = await http.put<AgePoliciesResponse>(
    `/api/contracts/${contractId}/age-policies`,
    body
  );
  return unwrap<AgePoliciesResponse>(raw);
}

// ─── Rooms ─────────────────────────────────────────────────────────────────
// GET → ContractRoom[] (bare array). PUT → { items: ContractRoom[] }.

export async function listContractRooms(
  contractId: string
): Promise<Result<ContractRoom[]>> {
  const raw = await http.get<ContractRoom[]>(`/api/contracts/${contractId}/rooms`);
  const r = unwrap<ContractRoom[]>(raw);
  if (r.error) return r;
  return { data: r.data ?? [], error: null };
}

export async function putContractRooms(
  contractId: string,
  items: ContractRoom[]
): Promise<Result<{ items: ContractRoom[] }>> {
  const raw = await http.put<{ items: ContractRoom[] }>(
    `/api/contracts/${contractId}/rooms`,
    { items }
  );
  return unwrap<{ items: ContractRoom[] }>(raw);
}

// ─── Seasons ───────────────────────────────────────────────────────────────
// GET (?include=date_ranges) → ContractSeasonRow[]. PUT → { items: ContractSeasonRow[] }.

export async function listContractSeasons(
  contractId: string
): Promise<Result<ContractSeasonRow[]>> {
  const raw = await http.get<ContractSeasonRow[]>(
    `/api/contracts/${contractId}/seasons`,
    { include: "date_ranges" }
  );
  const r = unwrap<ContractSeasonRow[]>(raw);
  if (r.error) return r;
  return { data: r.data ?? [], error: null };
}

export async function putContractSeasons(
  contractId: string,
  items: ContractSeason[]
): Promise<Result<{ items: ContractSeasonRow[] }>> {
  const raw = await http.put<{ items: ContractSeasonRow[] }>(
    `/api/contracts/${contractId}/seasons`,
    { items }
  );
  return unwrap<{ items: ContractSeasonRow[] }>(raw);
}

// ─── Taxes ─────────────────────────────────────────────────────────────────
// GET → ContractTax[] (bare array, items carry id). PUT body items have NO id (full replace).

export async function listContractTaxes(
  contractId: string
): Promise<Result<ContractTax[]>> {
  const raw = await http.get<ContractTax[]>(`/api/contracts/${contractId}/taxes`);
  const r = unwrap<ContractTax[]>(raw);
  if (r.error) return r;
  return { data: r.data ?? [], error: null };
}

export async function putContractTaxes(
  contractId: string,
  items: Omit<ContractTax, "id">[]
): Promise<Result<ContractTax[]>> {
  const raw = await http.put<ContractTax[]>(
    `/api/contracts/${contractId}/taxes`,
    { items }
  );
  const r = unwrap<ContractTax[]>(raw);
  if (r.error) return r;
  return { data: r.data ?? [], error: null };
}

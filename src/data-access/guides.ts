"use client";

import axios from "axios";
import { http } from "@/lib/api";
import { env } from "@/lib/env";
import { createClient } from "@/utils/supabase/client";
import {
  Guide,
  GuidePackage,
  GuidePackageOperationalHour,
  GuidePackageSupplement,
  GuidePackageTier,
  GuideSupplementMaster,
  Language,
} from "@/types/guides";

type Result<T> = { data: T | null; error: string | null };

function unwrap<T>(raw: unknown): Result<T> {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "error" in (raw as Record<string, unknown>)) {
    const err = (raw as { error?: unknown }).error;
    if (err) return { data: null, error: String(err) };
  }
  return { data: raw as T, error: null };
}

async function authedAxios() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return axios.create({
    baseURL: env.API_URL,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  });
}

function axiosErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) return e.response?.data?.message || e.message;
  if (e instanceof Error) return e.message;
  return "Request failed";
}

// ── Guide CRUD ───────────────────────────────────────────────

export async function listGuides(): Promise<Result<Guide[]>> {
  const raw = await http.get<Guide[]>("/api/guides");
  return unwrap<Guide[]>(raw);
}

export async function getGuideById(id: string): Promise<Result<Guide>> {
  const raw = await http.get<Guide>(`/api/guides/${id}`);
  return unwrap<Guide>(raw);
}

export type GuideCreatePayload = {
  name: string;
  country_id?: string | null;
  city_id?: string | null;
  currency: string;
  is_active: boolean;
};

export async function createGuide(data: GuideCreatePayload): Promise<Result<Guide>> {
  const raw = await http.post<Guide>("/api/guides", data);
  return unwrap<Guide>(raw);
}

export async function patchGuide(
  id: string,
  data: Partial<GuideCreatePayload>,
): Promise<Result<Guide>> {
  try {
    const client = await authedAxios();
    const res = await client.patch<Guide>(`/api/guides/${id}`, data);
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function deleteGuide(id: string): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(`/api/guides/${id}`);
  return unwrap<{ deleted: boolean }>(raw);
}

// ── Package CRUD ─────────────────────────────────────────────

export type GuidePackageCreatePayload = {
  name: string;
  guide_type: GuidePackage["guide_type"];
  duration_type: GuidePackage["duration_type"];
  duration_hours?: number | null;
  description?: string | null;
  is_active: boolean;
  languages?: string[];
};

export async function createPackage(
  guideId: string,
  data: GuidePackageCreatePayload,
): Promise<Result<GuidePackage>> {
  const raw = await http.post<GuidePackage>(`/api/guides/${guideId}/packages`, data);
  return unwrap<GuidePackage>(raw);
}

export async function patchPackage(
  guideId: string,
  packageId: string,
  data: Partial<GuidePackageCreatePayload>,
): Promise<Result<GuidePackage>> {
  try {
    const client = await authedAxios();
    const res = await client.patch<GuidePackage>(`/api/guides/${guideId}/packages/${packageId}`, data);
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function deletePackage(
  guideId: string,
  packageId: string,
): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(`/api/guides/${guideId}/packages/${packageId}`);
  return unwrap<{ deleted: boolean }>(raw);
}

// ── Sub-resource full-replace (PUT) ──────────────────────────

export async function replacePackageTiers(
  guideId: string,
  packageId: string,
  tiers: Omit<GuidePackageTier, "id" | "package_id">[],
): Promise<Result<GuidePackageTier[]>> {
  const raw = await http.put<GuidePackageTier[]>(
    `/api/guides/${guideId}/packages/${packageId}/tiers`,
    tiers,
  );
  return unwrap<GuidePackageTier[]>(raw);
}

export async function replacePackageOperationalHours(
  guideId: string,
  packageId: string,
  hours: Omit<GuidePackageOperationalHour, "id" | "package_id">[],
): Promise<Result<GuidePackageOperationalHour[]>> {
  const raw = await http.put<GuidePackageOperationalHour[]>(
    `/api/guides/${guideId}/packages/${packageId}/operational-hours`,
    hours,
  );
  return unwrap<GuidePackageOperationalHour[]>(raw);
}

export async function replacePackageSupplements(
  guideId: string,
  packageId: string,
  supplements: Omit<GuidePackageSupplement, "id" | "package_id">[],
): Promise<Result<GuidePackageSupplement[]>> {
  const raw = await http.put<GuidePackageSupplement[]>(
    `/api/guides/${guideId}/packages/${packageId}/supplements`,
    supplements,
  );
  return unwrap<GuidePackageSupplement[]>(raw);
}

// ── Master data ──────────────────────────────────────────────

export async function listGuideSupplements(): Promise<Result<GuideSupplementMaster[]>> {
  const raw = await http.get<GuideSupplementMaster[]>("/api/guides/master/supplements");
  return unwrap<GuideSupplementMaster[]>(raw);
}

export async function listLanguages(): Promise<Result<Language[]>> {
  const raw = await http.get<Language[]>("/api/master/languages");
  return unwrap<Language[]>(raw);
}

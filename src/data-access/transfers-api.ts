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
  TransferPackageDetail,
  TransferPackageCreateInput,
  TransferSeason,
  SeasonDateRange,
  SicRate,
  PrivatePerPaxRate,
  VehicleRateRow,
  VehicleRateType,
  DiscountType,
  AgePolicyBand,
  PackageTax,
  TransferAddonDetail,
  TransferAddonAgePolicyBand,
  TransferAddonRate,
  TransferAddonTotalRateTier,
  TransferAddonImage,
  TransferPackageAddonLink,
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
): Promise<Result<TransferPackageDetail[]>> {
  const raw = await http.get<TransferPackageDetail[]>(
    `/api/transfers/${transferId}/packages`,
  );
  return unwrap<TransferPackageDetail[]>(raw);
}

export async function listTransferCountries(): Promise<Result<TransferCountryOption[]>> {
  const raw = await http.get<TransferCountryOption[]>("/api/geo/countries");
  return unwrap<TransferCountryOption[]>(raw);
}

export async function listTransferCurrencies(): Promise<Result<TransferCurrencyOption[]>> {
  const raw = await http.get<TransferCurrencyOption[]>("/api/fixed-departures/meta/currencies");
  return unwrap<TransferCurrencyOption[]>(raw);
}

// ── Tab 2 — Packages ───────────────────────────────────────────────────

export async function createTransferPackage(
  transferId: string,
  input: Omit<
    TransferPackageDetail,
    'id' | 'transfer_id' | 'created_at' | 'updated_at' | 'transfer_package_stops' | 'transfer_operational_hours' | 'transfer_cancellation_policies'
  >,
): Promise<Result<TransferPackageDetail>> {
  const raw = await http.post<TransferPackageDetail>(
    `/api/transfers/${transferId}/packages`,
    input,
  );
  return unwrap<TransferPackageDetail>(raw);
}

export async function updateTransferPackage(
  packageId: string,
  input: Partial<TransferPackageCreateInput>,
): Promise<Result<TransferPackageDetail>> {
  try {
    const client = await authedAxios();
    const res = await client.patch<TransferPackageDetail>(
      `/api/transfers/packages/${packageId}`,
      input,
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function deleteTransferPackage(
  packageId: string,
): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(`/api/transfers/packages/${packageId}`);
  return unwrap<{ deleted: boolean }>(raw);
}

export async function replacePackageStops(
  packageId: string,
  stops: Array<{
    stop_order: number;
    stop_type: string;
    notes?: string | null;
    locations: Array<{ kind: 'geo' | 'dmc_custom' | 'master_catalog'; id: string }>;
  }>,
): Promise<Result<unknown>> {
  const raw = await http.put(`/api/transfers/packages/${packageId}/stops`, stops);
  return unwrap<unknown>(raw);
}

export async function replaceOperationalHours(
  packageId: string,
  hours: Array<{
    day_of_week: number;
    is_active: boolean;
    start_time: string | null;
    end_time: string | null;
  }>,
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/transfers/packages/${packageId}/operational-hours`,
    hours,
  );
  return unwrap<unknown>(raw);
}

export async function upsertCancellationPolicy(
  packageId: string,
  dto: { is_non_refundable: boolean },
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/transfers/packages/${packageId}/cancellation-policy`,
    dto,
  );
  return unwrap<unknown>(raw);
}

export async function replaceCancellationRules(
  packageId: string,
  rules: Array<{
    days_from: number;
    days_to: number;
    anchor: string;
    charge_type: string;
    charge_value: number;
    is_no_show: boolean;
  }>,
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/transfers/packages/${packageId}/cancellation-rules`,
    rules,
  );
  return unwrap<unknown>(raw);
}

// ── Tab 3 — Seasons & Rates ────────────────────────────────────────────

export async function listPackageSeasons(
  packageId: string,
): Promise<Result<TransferSeason[]>> {
  const raw = await http.get<TransferSeason[]>(`/api/transfers/packages/${packageId}/seasons`);
  return unwrap<TransferSeason[]>(raw);
}

export async function createSeason(
  packageId: string,
  dto: { name: string; status: string; sort_order?: number },
): Promise<Result<TransferSeason>> {
  const raw = await http.post<TransferSeason>(
    `/api/transfers/packages/${packageId}/seasons`,
    dto,
  );
  return unwrap<TransferSeason>(raw);
}

export async function patchSeason(
  seasonId: string,
  dto: {
    name?: string | null;
    exception_rules?: string | null;
    vehicle_rate_type?: VehicleRateType | null;
    child_discount_type?: DiscountType | null;
    child_discount_value?: number | null;
    infant_discount_type?: DiscountType | null;
    infant_discount_value?: number | null;
    sort_order?: number;
  },
): Promise<Result<TransferSeason>> {
  try {
    const client = await authedAxios();
    const res = await client.patch<TransferSeason>(`/api/transfers/seasons/${seasonId}`, dto);
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function deleteSeason(
  seasonId: string,
): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(`/api/transfers/seasons/${seasonId}`);
  return unwrap<{ deleted: boolean }>(raw);
}

export async function duplicateSeason(
  seasonId: string,
): Promise<Result<{ id: string; name: string }>> {
  const raw = await http.post<{ id: string; name: string }>(
    `/api/transfers/seasons/${seasonId}/duplicate`,
    {},
  );
  return unwrap<{ id: string; name: string }>(raw);
}

export async function replaceSeasonDateRanges(
  seasonId: string,
  ranges: SeasonDateRange[],
): Promise<Result<unknown>> {
  try {
    const client = await authedAxios();
    const res = await client.put(
      `/api/transfers/seasons/${seasonId}/date-ranges`,
      ranges,
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function replaceSeasonBlackoutDates(
  seasonId: string,
  dates: string[],
): Promise<Result<unknown>> {
  try {
    const client = await authedAxios();
    const res = await client.put(
      `/api/transfers/seasons/${seasonId}/blackout-dates`,
      dates,
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function replaceSeasonSicRates(
  seasonId: string,
  rates: SicRate[],
): Promise<Result<unknown>> {
  try {
    const client = await authedAxios();
    const res = await client.put(
      `/api/transfers/seasons/${seasonId}/sic-rates`,
      rates,
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function replaceSeasonPrivateRates(
  seasonId: string,
  rates: PrivatePerPaxRate[],
): Promise<Result<unknown>> {
  try {
    const client = await authedAxios();
    const res = await client.put(
      `/api/transfers/seasons/${seasonId}/private-rates`,
      rates,
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

// Backend strips `brand` field; sending it is harmless but we drop it client-side
// to keep payloads minimal.
export async function replaceSeasonVehicleRates(
  seasonId: string,
  rates: VehicleRateRow[],
): Promise<Result<unknown>> {
  const stripped = rates.map((r) => ({
    vehicle_type_id: r.vehicle_type_id,
    rate: r.rate,
    max_pax: r.max_pax,
    max_pax_with_luggage: r.max_pax_with_luggage,
    max_luggage: r.max_luggage,
    max_kms_day: r.max_kms_day,
    max_hrs_day: r.max_hrs_day,
    supplement_hr: r.supplement_hr,
    supplement_km: r.supplement_km,
  }));
  try {
    const client = await authedAxios();
    const res = await client.put(
      `/api/transfers/seasons/${seasonId}/vehicle-rates`,
      stripped,
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function replacePackageAgePolicies(
  packageId: string,
  bands: AgePolicyBand[],
): Promise<Result<unknown>> {
  try {
    const client = await authedAxios();
    const res = await client.put(
      `/api/transfers/packages/${packageId}/age-policies`,
      bands.map((b, i) => ({
        band_name: b.band_name,
        age_from: b.age_from,
        age_to: b.age_to,
        band_order: b.band_order ?? i,
      })),
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function listPackageTaxes(
  packageId: string,
): Promise<Result<PackageTax[]>> {
  const raw = await http.get<PackageTax[]>(`/api/transfers/packages/${packageId}/taxes`);
  return unwrap<PackageTax[]>(raw);
}

export async function replacePackageTaxes(
  packageId: string,
  taxes: PackageTax[],
): Promise<Result<PackageTax[]>> {
  try {
    const client = await authedAxios();
    const res = await client.put<PackageTax[]>(
      `/api/transfers/packages/${packageId}/taxes`,
      taxes.map((t) => ({
        name: t.name,
        rate: t.rate,
        rate_type: t.rate_type,
        is_inclusive: t.is_inclusive,
      })),
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

// ── Tab 4 — Add-ons ────────────────────────────────────────────────────

export async function listTransferAddons(
  transferId: string,
): Promise<Result<TransferAddonDetail[]>> {
  const raw = await http.get<TransferAddonDetail[]>(
    `/api/transfers/${transferId}/addons`,
  );
  return unwrap<TransferAddonDetail[]>(raw);
}

export async function createTransferAddon(
  transferId: string,
  dto: Partial<TransferAddonDetail>,
): Promise<Result<TransferAddonDetail>> {
  const raw = await http.post<TransferAddonDetail>(
    `/api/transfers/${transferId}/addons`,
    dto,
  );
  return unwrap<TransferAddonDetail>(raw);
}

export async function updateTransferAddon(
  addonId: string,
  dto: Partial<TransferAddonDetail>,
): Promise<Result<TransferAddonDetail>> {
  try {
    const client = await authedAxios();
    const res = await client.patch<TransferAddonDetail>(
      `/api/transfers/addons/${addonId}`,
      dto,
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function deleteTransferAddon(
  addonId: string,
): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(
    `/api/transfers/addons/${addonId}`,
  );
  return unwrap<{ deleted: boolean }>(raw);
}

export async function replaceTransferAddonAgePolicies(
  addonId: string,
  bands: TransferAddonAgePolicyBand[],
): Promise<Result<unknown>> {
  try {
    const client = await authedAxios();
    const res = await client.put(
      `/api/transfers/addons/${addonId}/age-policies`,
      bands.map((b, i) => ({
        band_name: b.band_name,
        age_from: b.age_from,
        age_to: b.age_to,
        band_order: b.band_order ?? i,
      })),
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function replaceTransferAddonRates(
  addonId: string,
  rates: TransferAddonRate[],
): Promise<Result<unknown>> {
  try {
    const client = await authedAxios();
    const res = await client.put(
      `/api/transfers/addons/${addonId}/rates`,
      rates.map((r) => ({ band_name: r.band_name, rate: r.rate })),
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function replaceTransferAddonTotalRates(
  addonId: string,
  tiers: TransferAddonTotalRateTier[],
): Promise<Result<unknown>> {
  try {
    const client = await authedAxios();
    const res = await client.put(
      `/api/transfers/addons/${addonId}/total-rates`,
      tiers.map((t) => ({
        min_pax: t.min_pax,
        max_pax: t.max_pax,
        rate: t.rate,
      })),
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function addTransferAddonImage(
  addonId: string,
  dto: { url: string; caption?: string | null; sort_order?: number | null },
): Promise<Result<TransferAddonImage>> {
  const raw = await http.post<TransferAddonImage>(
    `/api/transfers/addons/${addonId}/images`,
    dto,
  );
  return unwrap<TransferAddonImage>(raw);
}

export async function deleteTransferAddonImage(
  imageId: string,
): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(
    `/api/transfers/addon-images/${imageId}`,
  );
  return unwrap<{ deleted: boolean }>(raw);
}

export async function replacePackageAddons(
  packageId: string,
  links: TransferPackageAddonLink[],
): Promise<Result<unknown>> {
  try {
    const client = await authedAxios();
    const res = await client.put(
      `/api/transfers/packages/${packageId}/addons`,
      links.map((l) => ({
        addon_id: l.addon_id,
        is_mandatory: Boolean(l.is_mandatory),
      })),
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

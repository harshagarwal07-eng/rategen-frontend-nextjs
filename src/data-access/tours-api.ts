"use client";

import axios from "axios";
import http from "@/lib/api";
import { env } from "@/lib/env";
import { createClient } from "@/utils/supabase/client";
import {
  TourListRow,
  TourCreateInput,
  TourUpdateInput,
  TourCreated,
  TourDetail,
  TourCountryOption,
  TourCurrencyOption,
  TourImageRow,
  TourPackageDetail,
  TourPackageCreateInput,
  TourPackageSeason,
  TourSeasonDateRange,
  TourPaxRate,
  TourPrivatePerPaxRate,
  TourVehicleRate,
  TourAgePolicyBand,
  TourPackageTax,
  TourPackageComponent,
  TourLinkedPackage,
  TourComboLocation,
  TourMasterCatalogItem,
  TourItineraryDay,
  TourCancellationRule,
  TourOperationalHour,
  TourPackageAddonLink,
  TourAddonDetail,
  TourAddonAgePolicyBand,
  TourAddonRate,
  TourAddonTotalRateTier,
  TourAddonImage,
} from "@/types/tours";

type Result<T> = { data: T | null; error: string | null };

function unwrap<T>(raw: unknown): Result<T> {
  if (
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "error" in raw &&
    (raw as { error?: unknown }).error
  ) {
    return { data: null, error: String((raw as { error: unknown }).error) };
  }
  return { data: raw as T, error: null };
}

// http helper in lib/api.ts has a `patch` method, but it goes through the
// ApiResponse<T> envelope. Backend tour endpoints return raw rows for
// patch. Use a fresh axios client to bypass envelope unwrap.
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

// ── Tours ────────────────────────────────────────────────────

export async function listTours(): Promise<Result<TourListRow[]>> {
  const raw = await http.get<TourListRow[]>("/api/tours");
  return unwrap<TourListRow[]>(raw);
}

export async function getTourById(id: string): Promise<Result<TourDetail>> {
  const raw = await http.get<TourDetail>(`/api/tours/${id}`);
  return unwrap<TourDetail>(raw);
}

export async function createTour(
  input: TourCreateInput,
): Promise<Result<TourCreated>> {
  const raw = await http.post<TourCreated>("/api/tours", input);
  return unwrap<TourCreated>(raw);
}

export async function updateTour(
  id: string,
  input: TourUpdateInput,
): Promise<Result<TourDetail>> {
  try {
    const client = await authedAxios();
    const res = await client.patch<TourDetail>(`/api/tours/${id}`, input);
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function deleteTour(
  id: string,
): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(`/api/tours/${id}`);
  return unwrap<{ deleted: boolean }>(raw);
}

export async function listTourCountries(): Promise<
  Result<TourCountryOption[]>
> {
  const raw = await http.get<TourCountryOption[]>("/api/geo/countries");
  return unwrap<TourCountryOption[]>(raw);
}

export async function listTourCurrencies(): Promise<
  Result<TourCurrencyOption[]>
> {
  const raw = await http.get<TourCurrencyOption[]>(
    "/api/fixed-departures/meta/currencies",
  );
  return unwrap<TourCurrencyOption[]>(raw);
}

// ── Tour Images ──────────────────────────────────────────────

export async function addTourImage(
  tourId: string,
  dto: { url: string; caption?: string | null; sort_order?: number | null },
): Promise<Result<TourImageRow>> {
  const raw = await http.post<TourImageRow>(`/api/tours/${tourId}/images`, dto);
  return unwrap<TourImageRow>(raw);
}

export async function deleteTourImage(
  imageId: string,
): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(
    `/api/tours/images/${imageId}`,
  );
  return unwrap<{ deleted: boolean }>(raw);
}

// ── Master Catalog ───────────────────────────────────────────

export async function searchMasterCatalog(
  q: string,
  kind?: string,
  countryId?: string | null,
): Promise<Result<TourMasterCatalogItem[]>> {
  const params = new URLSearchParams({ q });
  if (kind) params.set("kind", kind);
  if (countryId) params.set("country_id", countryId);
  const raw = await http.get<TourMasterCatalogItem[]>(
    `/api/tours/master-catalog/search?${params.toString()}`,
  );
  return unwrap<TourMasterCatalogItem[]>(raw);
}

export async function listMasterCatalog(opts: {
  geo_id?: string;
  kind?: string;
  parent_id?: string;
  country_id?: string | null;
}): Promise<Result<TourMasterCatalogItem[]>> {
  const params = new URLSearchParams();
  if (opts.geo_id) params.set("geo_id", opts.geo_id);
  if (opts.kind) params.set("kind", opts.kind);
  if (opts.parent_id) params.set("parent_id", opts.parent_id);
  if (opts.country_id) params.set("country_id", opts.country_id);
  const qs = params.toString();
  const raw = await http.get<TourMasterCatalogItem[]>(
    `/api/tours/master-catalog${qs ? `?${qs}` : ""}`,
  );
  return unwrap<TourMasterCatalogItem[]>(raw);
}

// ── Tour Packages ────────────────────────────────────────────

export async function listTourPackages(
  tourId: string,
): Promise<Result<TourPackageDetail[]>> {
  const raw = await http.get<TourPackageDetail[]>(
    `/api/tours/${tourId}/packages`,
  );
  return unwrap<TourPackageDetail[]>(raw);
}

export async function createTourPackage(
  tourId: string,
  input: TourPackageCreateInput,
): Promise<Result<TourPackageDetail>> {
  const raw = await http.post<TourPackageDetail>(
    `/api/tours/${tourId}/packages`,
    input,
  );
  return unwrap<TourPackageDetail>(raw);
}

export async function updateTourPackage(
  packageId: string,
  input: TourPackageCreateInput,
): Promise<Result<TourPackageDetail>> {
  try {
    const client = await authedAxios();
    const res = await client.patch<TourPackageDetail>(
      `/api/tours/packages/${packageId}`,
      input,
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function deleteTourPackage(
  packageId: string,
): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(
    `/api/tours/packages/${packageId}`,
  );
  return unwrap<{ deleted: boolean }>(raw);
}

export async function duplicateTourPackage(
  packageId: string,
): Promise<Result<{ id: string; name: string }>> {
  const raw = await http.post<{ id: string; name: string }>(
    `/api/tours/packages/${packageId}/duplicate`,
    {},
  );
  return unwrap<{ id: string; name: string }>(raw);
}

// ── Package — age policies ───────────────────────────────────

export async function getPackageAgePolicies(
  packageId: string,
): Promise<Result<TourAgePolicyBand[]>> {
  const raw = await http.get<TourAgePolicyBand[]>(
    `/api/tours/packages/${packageId}/age-policies`,
  );
  return unwrap<TourAgePolicyBand[]>(raw);
}

export async function replacePackageAgePolicies(
  packageId: string,
  bands: TourAgePolicyBand[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/packages/${packageId}/age-policies`,
    bands.map((b, i) => ({
      band_name: b.band_name,
      age_from: b.age_from,
      age_to: b.age_to,
      band_order: b.band_order ?? i,
    })),
  );
  return unwrap<unknown>(raw);
}

// ── Package — components (master catalog links) ──────────────

export async function getPackageComponents(
  packageId: string,
): Promise<Result<TourPackageComponent[]>> {
  const raw = await http.get<TourPackageComponent[]>(
    `/api/tours/packages/${packageId}/components`,
  );
  return unwrap<TourPackageComponent[]>(raw);
}

export async function replacePackageComponents(
  packageId: string,
  components: { master_catalog_id: string; sort_order: number }[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/packages/${packageId}/components`,
    components,
  );
  return unwrap<unknown>(raw);
}

// ── Package — combo: linked packages + per-item locations ────

export async function getPackageLinkedPackages(
  packageId: string,
): Promise<Result<TourLinkedPackage[]>> {
  const raw = await http.get<TourLinkedPackage[]>(
    `/api/tours/packages/${packageId}/linked-packages`,
  );
  return unwrap<TourLinkedPackage[]>(raw);
}

export async function replacePackageLinkedPackages(
  packageId: string,
  body: Array<{
    linked_type: string;
    linked_tour_package_id: string | null;
    linked_transfer_package_id: string | null;
    geo_id: string | null;
    free_text_name: string | null;
    sort_order: number;
  }>,
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/packages/${packageId}/linked-packages`,
    body,
  );
  return unwrap<unknown>(raw);
}

export async function getPackageComboLocations(
  packageId: string,
): Promise<Result<TourComboLocation[]>> {
  const raw = await http.get<TourComboLocation[]>(
    `/api/tours/packages/${packageId}/combo-locations`,
  );
  return unwrap<TourComboLocation[]>(raw);
}

export async function replacePackageComboLocations(
  packageId: string,
  body: { pool_item_id: string; geo_id: string | null }[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/packages/${packageId}/combo-locations`,
    body,
  );
  return unwrap<unknown>(raw);
}

// ── Package — taxes / addons / hours / cancellation / itinerary

export async function getPackageTaxes(
  packageId: string,
): Promise<Result<TourPackageTax[]>> {
  const raw = await http.get<TourPackageTax[]>(
    `/api/tours/packages/${packageId}/taxes`,
  );
  return unwrap<TourPackageTax[]>(raw);
}

export async function replacePackageTaxes(
  packageId: string,
  taxes: TourPackageTax[],
): Promise<Result<TourPackageTax[]>> {
  const raw = await http.put<TourPackageTax[]>(
    `/api/tours/packages/${packageId}/taxes`,
    taxes.map((t) => ({
      name: t.name,
      rate: t.rate,
      rate_type: t.rate_type,
      is_inclusive: t.is_inclusive,
    })),
  );
  return unwrap<TourPackageTax[]>(raw);
}

export async function replacePackageAddons(
  packageId: string,
  links: TourPackageAddonLink[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/packages/${packageId}/addons`,
    links.map((l) => ({
      addon_id: l.addon_id,
      is_mandatory: Boolean(l.is_mandatory),
    })),
  );
  return unwrap<unknown>(raw);
}

export async function replaceOperationalHours(
  packageId: string,
  hours: TourOperationalHour[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/packages/${packageId}/operational-hours`,
    hours,
  );
  return unwrap<unknown>(raw);
}

export async function upsertCancellationPolicy(
  packageId: string,
  dto: { is_non_refundable: boolean },
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/packages/${packageId}/cancellation-policy`,
    dto,
  );
  return unwrap<unknown>(raw);
}

export async function replaceCancellationRules(
  packageId: string,
  rules: TourCancellationRule[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/packages/${packageId}/cancellation-rules`,
    rules,
  );
  return unwrap<unknown>(raw);
}

export async function replaceItineraryDays(
  packageId: string,
  days: TourItineraryDay[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/packages/${packageId}/itinerary-days`,
    days.map((d) => ({
      day_number: d.day_number,
      origin_city_id: d.origin_city_id,
      destination_city_id: d.destination_city_id,
      description: d.description,
    })),
  );
  return unwrap<unknown>(raw);
}

// ── Seasons (individual CRUD; no batch replace) ──────────────

export async function listPackageSeasons(
  packageId: string,
): Promise<Result<TourPackageSeason[]>> {
  const raw = await http.get<TourPackageSeason[]>(
    `/api/tours/packages/${packageId}/seasons`,
  );
  return unwrap<TourPackageSeason[]>(raw);
}

export async function createSeason(
  packageId: string,
  dto: { name?: string | null; status?: string; sort_order?: number },
): Promise<Result<TourPackageSeason>> {
  const raw = await http.post<TourPackageSeason>(
    `/api/tours/packages/${packageId}/seasons`,
    dto,
  );
  return unwrap<TourPackageSeason>(raw);
}

export async function patchSeason(
  seasonId: string,
  dto: Partial<{
    exception_rules: string | null;
    vehicle_rate_type: string | null;
    private_rate_mode: "per_pax" | "tiered";
    child_discount_type: string | null;
    child_discount_value: number | null;
    infant_discount_type: string | null;
    infant_discount_value: number | null;
    total_rate: number | null;
    total_min_pax: number | null;
    total_max_pax: number | null;
    sort_order: number;
    status: string;
  }>,
): Promise<Result<TourPackageSeason>> {
  try {
    const client = await authedAxios();
    const res = await client.patch<TourPackageSeason>(
      `/api/tours/seasons/${seasonId}`,
      dto,
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function deleteSeason(
  seasonId: string,
): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(
    `/api/tours/seasons/${seasonId}`,
  );
  return unwrap<{ deleted: boolean }>(raw);
}

export async function duplicateSeason(
  seasonId: string,
): Promise<Result<{ id: string }>> {
  const raw = await http.post<{ id: string }>(
    `/api/tours/seasons/${seasonId}/duplicate`,
    {},
  );
  return unwrap<{ id: string }>(raw);
}

export async function replaceSeasonDateRanges(
  seasonId: string,
  ranges: TourSeasonDateRange[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/seasons/${seasonId}/date-ranges`,
    ranges.map((r) => ({ valid_from: r.valid_from, valid_till: r.valid_till })),
  );
  return unwrap<unknown>(raw);
}

export async function replaceSeasonBlackoutDates(
  seasonId: string,
  dates: string[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/seasons/${seasonId}/blackout-dates`,
    dates,
  );
  return unwrap<unknown>(raw);
}

export async function replaceSeasonPaxRates(
  seasonId: string,
  rates: TourPaxRate[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/seasons/${seasonId}/pax-rates`,
    rates.map((r) => ({ band_name: r.band_name, rate: r.rate })),
  );
  return unwrap<unknown>(raw);
}

export async function replaceSeasonPrivateRates(
  seasonId: string,
  rates: TourPrivatePerPaxRate[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/seasons/${seasonId}/private-rates`,
    rates.map((r) => ({ pax_count: r.pax_count, rate: r.rate })),
  );
  return unwrap<unknown>(raw);
}

export async function replaceSeasonVehicleRates(
  seasonId: string,
  rates: TourVehicleRate[],
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
  const raw = await http.put(
    `/api/tours/seasons/${seasonId}/vehicle-rates`,
    stripped,
  );
  return unwrap<unknown>(raw);
}

// ── Tour Addons ──────────────────────────────────────────────

export async function listTourAddons(
  tourId: string,
): Promise<Result<TourAddonDetail[]>> {
  const raw = await http.get<TourAddonDetail[]>(`/api/tours/${tourId}/addons`);
  return unwrap<TourAddonDetail[]>(raw);
}

export async function createTourAddon(
  tourId: string,
  dto: Partial<TourAddonDetail>,
): Promise<Result<TourAddonDetail>> {
  const raw = await http.post<TourAddonDetail>(
    `/api/tours/${tourId}/addons`,
    dto,
  );
  return unwrap<TourAddonDetail>(raw);
}

export async function updateTourAddon(
  addonId: string,
  dto: Partial<TourAddonDetail>,
): Promise<Result<TourAddonDetail>> {
  try {
    const client = await authedAxios();
    const res = await client.patch<TourAddonDetail>(
      `/api/tours/addons/${addonId}`,
      dto,
    );
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: axiosErrorMessage(e) };
  }
}

export async function deleteTourAddon(
  addonId: string,
): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(
    `/api/tours/addons/${addonId}`,
  );
  return unwrap<{ deleted: boolean }>(raw);
}

export async function replaceAddonAgePolicies(
  addonId: string,
  bands: TourAddonAgePolicyBand[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/addons/${addonId}/age-policies`,
    bands.map((b, i) => ({
      band_name: b.band_name,
      age_from: b.age_from,
      age_to: b.age_to,
      band_order: b.band_order ?? i,
    })),
  );
  return unwrap<unknown>(raw);
}

export async function replaceAddonRates(
  addonId: string,
  rates: TourAddonRate[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/addons/${addonId}/rates`,
    rates.map((r) => ({ band_name: r.band_name, rate: r.rate })),
  );
  return unwrap<unknown>(raw);
}

export async function replaceAddonTotalRates(
  addonId: string,
  tiers: TourAddonTotalRateTier[],
): Promise<Result<unknown>> {
  const raw = await http.put(
    `/api/tours/addons/${addonId}/total-rates`,
    tiers.map((t) => ({
      min_pax: t.min_pax,
      max_pax: t.max_pax,
      rate: t.rate,
    })),
  );
  return unwrap<unknown>(raw);
}

export async function addAddonImage(
  addonId: string,
  dto: { url: string; caption?: string | null; sort_order?: number | null },
): Promise<Result<TourAddonImage>> {
  const raw = await http.post<TourAddonImage>(
    `/api/tours/addons/${addonId}/images`,
    dto,
  );
  return unwrap<TourAddonImage>(raw);
}

export async function deleteAddonImage(
  imageId: string,
): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(
    `/api/tours/addon-images/${imageId}`,
  );
  return unwrap<{ deleted: boolean }>(raw);
}

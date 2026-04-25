"use client";

import axios from "axios";
import { createClient } from "@/utils/supabase/client";
import { env } from "@/lib/env";
import type {
  FDCountry,
  FDCity,
  FDCurrency,
  FDPackageListRow,
  FDPackageDetail,
  FDAgePolicy,
  FDItineraryDay,
  FDAddon,
  FDAddonItineraryDay,
  FDDeparture,
  FDDeparturePricing,
  FDAddonDeparturePricing,
  FDCancellationRule,
  FDPaymentScheduleItem,
  FDFlightSegment,
  FDFlightPricing,
  FDVisa,
  FDTax,
} from "@/types/fixed-departures";

const fdApi = axios.create({
  baseURL: env.API_URL,
  headers: { "Content-Type": "application/json" },
});

fdApi.interceptors.request.use(async (config) => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

const BASE = "/api/fixed-departures";

export async function fdGetCountries(): Promise<FDCountry[]> {
  const { data } = await fdApi.get<FDCountry[]>(`${BASE}/meta/countries`);
  return data;
}

export async function fdGetCitiesByCountry(countryId: string, search?: string): Promise<FDCity[]> {
  const { data } = await fdApi.get<FDCity[]>(`${BASE}/meta/countries/${countryId}/cities`, {
    params: search ? { search } : {},
  });
  return data;
}

export async function fdGetCitiesGlobal(search?: string): Promise<FDCity[]> {
  const { data } = await fdApi.get<FDCity[]>(`${BASE}/meta/cities`, {
    params: search ? { search } : {},
  });
  return data;
}

export async function fdGetCurrencies(): Promise<FDCurrency[]> {
  const { data } = await fdApi.get<FDCurrency[]>(`${BASE}/meta/currencies`);
  return data;
}

export async function fdListPackages(): Promise<FDPackageListRow[]> {
  const { data } = await fdApi.get<FDPackageListRow[]>(`${BASE}/packages`);
  return data;
}

export async function fdGetPackage(id: string): Promise<FDPackageDetail> {
  const { data } = await fdApi.get<FDPackageDetail>(`${BASE}/packages/${id}`);
  return data;
}

export async function fdCreatePackage(payload: Partial<FDPackageDetail>): Promise<FDPackageDetail> {
  const { data } = await fdApi.post<FDPackageDetail>(`${BASE}/packages`, payload);
  return data;
}

export async function fdUpdatePackage(
  id: string,
  payload: Partial<FDPackageDetail>,
): Promise<FDPackageDetail> {
  const { data } = await fdApi.patch<FDPackageDetail>(`${BASE}/packages/${id}`, payload);
  return data;
}

export async function fdDeletePackage(id: string): Promise<FDPackageDetail> {
  const { data } = await fdApi.delete<FDPackageDetail>(`${BASE}/packages/${id}`);
  return data;
}

export async function fdGetPackageCountries(packageId: string): Promise<FDCountry[]> {
  const { data } = await fdApi.get<FDCountry[]>(`${BASE}/packages/${packageId}/countries`);
  return data;
}

export async function fdReplacePackageCountries(packageId: string, countryIds: string[]): Promise<unknown[]> {
  const { data } = await fdApi.put<unknown[]>(`${BASE}/packages/${packageId}/countries`, {
    country_ids: countryIds,
  });
  return data;
}

export async function fdGetPackageCities(packageId: string): Promise<FDCity[]> {
  const { data } = await fdApi.get<FDCity[]>(`${BASE}/packages/${packageId}/cities`);
  return data;
}

export async function fdReplacePackageCities(packageId: string, cityIds: string[]): Promise<unknown[]> {
  const { data } = await fdApi.put<unknown[]>(`${BASE}/packages/${packageId}/cities`, {
    city_ids: cityIds,
  });
  return data;
}

export async function fdReplaceAgePolicies(packageId: string, bands: Omit<FDAgePolicy, "id" | "package_id">[]): Promise<FDAgePolicy[]> {
  const { data } = await fdApi.put<FDAgePolicy[]>(`${BASE}/packages/${packageId}/age-policies`, bands);
  return data;
}

export async function fdReplaceItinerary(
  packageId: string,
  days: Array<Omit<FDItineraryDay, "id" | "package_id" | "overnight_city">>,
): Promise<FDItineraryDay[]> {
  const { data } = await fdApi.put<FDItineraryDay[]>(`${BASE}/packages/${packageId}/itinerary`, days);
  return data;
}

export async function fdListAddons(packageId: string): Promise<FDAddon[]> {
  const { data } = await fdApi.get<FDAddon[]>(`${BASE}/packages/${packageId}/addons`);
  return data;
}

export async function fdCreateAddon(packageId: string, payload: Partial<FDAddon>): Promise<FDAddon> {
  const { data } = await fdApi.post<FDAddon>(`${BASE}/packages/${packageId}/addons`, payload);
  return data;
}

export async function fdUpdateAddon(addonId: string, payload: Partial<FDAddon>): Promise<FDAddon> {
  const { data } = await fdApi.patch<FDAddon>(`${BASE}/addons/${addonId}`, payload);
  return data;
}

export async function fdDeleteAddon(addonId: string): Promise<{ deleted: boolean }> {
  const { data } = await fdApi.delete<{ deleted: boolean }>(`${BASE}/addons/${addonId}`);
  return data;
}

export async function fdReplaceAddonItinerary(
  addonId: string,
  days: Array<Omit<FDAddonItineraryDay, "id" | "addon_id" | "overnight_city">>,
): Promise<FDAddonItineraryDay[]> {
  const { data } = await fdApi.put<FDAddonItineraryDay[]>(`${BASE}/addons/${addonId}/itinerary`, days);
  return data;
}

export async function fdListDepartures(packageId: string): Promise<FDDeparture[]> {
  const { data } = await fdApi.get<FDDeparture[]>(`${BASE}/packages/${packageId}/departures`);
  return data;
}

export async function fdCreateDeparture(
  packageId: string,
  payload: Partial<FDDeparture>,
): Promise<FDDeparture> {
  const { data } = await fdApi.post<FDDeparture>(`${BASE}/packages/${packageId}/departures`, payload);
  return data;
}

export interface FDBulkCreatePayload {
  departures: Array<Partial<FDDeparture>>;
  pricing: Pick<
    FDDeparturePricing,
    "rate_single" | "rate_double" | "rate_triple" | "rate_child_no_bed" | "rate_child_extra_bed" | "rate_infant"
  > | null;
}

export async function fdBulkCreateDepartures(
  packageId: string,
  payload: FDBulkCreatePayload,
): Promise<{ created: FDDeparture[] }> {
  const { data } = await fdApi.post<{ created: FDDeparture[] }>(
    `${BASE}/packages/${packageId}/departures/bulk`,
    payload,
  );
  return data;
}

export async function fdUpdateDeparture(
  departureId: string,
  payload: Partial<FDDeparture>,
): Promise<FDDeparture> {
  const { data } = await fdApi.patch<FDDeparture>(`${BASE}/departures/${departureId}`, payload);
  return data;
}

export async function fdDeleteDeparture(departureId: string): Promise<{ deleted: boolean }> {
  const { data } = await fdApi.delete<{ deleted: boolean }>(`${BASE}/departures/${departureId}`);
  return data;
}

export async function fdUpsertDeparturePricing(
  departureId: string,
  payload: Omit<FDDeparturePricing, "id" | "departure_date_id">,
): Promise<FDDeparturePricing> {
  const { data } = await fdApi.put<FDDeparturePricing>(`${BASE}/departures/${departureId}/pricing`, payload);
  return data;
}

export async function fdGetAddonDeparturePricing(departureId: string): Promise<FDAddonDeparturePricing[]> {
  const { data } = await fdApi.get<FDAddonDeparturePricing[]>(`${BASE}/departures/${departureId}/addon-pricing`);
  return data;
}

export async function fdUpsertAddonDeparturePricing(
  departureId: string,
  rows: Array<Omit<FDAddonDeparturePricing, "id" | "departure_date_id">>,
): Promise<FDAddonDeparturePricing[]> {
  const { data } = await fdApi.put<FDAddonDeparturePricing[]>(
    `${BASE}/departures/${departureId}/addon-pricing`,
    rows,
  );
  return data;
}

export async function fdGetCancellationPolicy(departureId: string): Promise<FDCancellationRule[]> {
  const { data } = await fdApi.get<FDCancellationRule[]>(`${BASE}/departures/${departureId}/cancellation-policy`);
  return data;
}

export async function fdReplaceCancellationPolicy(
  departureId: string,
  rules: Array<Omit<FDCancellationRule, "id" | "departure_date_id">>,
): Promise<FDCancellationRule[]> {
  const { data } = await fdApi.put<FDCancellationRule[]>(
    `${BASE}/departures/${departureId}/cancellation-policy`,
    rules,
  );
  return data;
}

export async function fdGetPaymentSchedule(departureId: string): Promise<FDPaymentScheduleItem[]> {
  const { data } = await fdApi.get<FDPaymentScheduleItem[]>(`${BASE}/departures/${departureId}/payment-schedule`);
  return data;
}

export async function fdReplacePaymentSchedule(
  departureId: string,
  items: Array<Omit<FDPaymentScheduleItem, "id" | "departure_date_id">>,
): Promise<FDPaymentScheduleItem[]> {
  const { data } = await fdApi.put<FDPaymentScheduleItem[]>(
    `${BASE}/departures/${departureId}/payment-schedule`,
    items,
  );
  return data;
}

export async function fdGetFlights(packageId: string): Promise<FDFlightSegment[]> {
  const { data } = await fdApi.get<FDFlightSegment[]>(`${BASE}/packages/${packageId}/flights`);
  return data;
}

export async function fdReplaceFlights(
  packageId: string,
  flights: Array<Omit<FDFlightSegment, "id" | "package_id">>,
): Promise<FDFlightSegment[]> {
  const { data } = await fdApi.put<FDFlightSegment[]>(`${BASE}/packages/${packageId}/flights`, flights);
  return data;
}

export async function fdUpsertFlightPricing(
  departureId: string,
  payload: Omit<FDFlightPricing, "id" | "departure_date_id">,
): Promise<FDFlightPricing> {
  const { data } = await fdApi.put<FDFlightPricing>(
    `${BASE}/departures/${departureId}/flight-pricing`,
    payload,
  );
  return data;
}

export async function fdGetVisa(packageId: string): Promise<FDVisa | null> {
  const { data } = await fdApi.get<FDVisa | null>(`${BASE}/packages/${packageId}/visa`);
  return data;
}

export async function fdUpsertVisa(packageId: string, payload: Omit<FDVisa, "id" | "package_id">): Promise<FDVisa> {
  const { data } = await fdApi.put<FDVisa>(`${BASE}/packages/${packageId}/visa`, payload);
  return data;
}

export async function fdGetTaxes(packageId: string): Promise<FDTax[]> {
  const { data } = await fdApi.get<FDTax[]>(`${BASE}/packages/${packageId}/taxes`);
  return data;
}

export async function fdReplaceTaxes(
  packageId: string,
  taxes: Array<Omit<FDTax, "id" | "package_id">>,
): Promise<FDTax[]> {
  const { data } = await fdApi.put<FDTax[]>(`${BASE}/packages/${packageId}/taxes`, taxes);
  return data;
}

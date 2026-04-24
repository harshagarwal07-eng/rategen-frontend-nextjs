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

export async function fdGetCitiesByCountry(countryId: string): Promise<FDCity[]> {
  const { data } = await fdApi.get<FDCity[]>(`${BASE}/meta/countries/${countryId}/cities`);
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

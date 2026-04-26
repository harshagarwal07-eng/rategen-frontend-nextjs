"use client";

import http from "@/lib/api";
import type { TransferCountryOption } from "@/types/transfers";

// ── Tree types (mirrors backend dto) ─────────────────────────────

export interface TreeAreaNode {
  id: string;
  name: string;
  type: "area";
}

export interface TreeZoneNode {
  id: string;
  name: string;
  type: "zone";
  areas: TreeAreaNode[];
}

export interface TreeCityNode {
  id: string;
  name: string;
  type: "city";
  zones: TreeZoneNode[];
  areas: TreeAreaNode[];
}

export interface CountryTreeResponse {
  country_id: string;
  country_name: string;
  cities: TreeCityNode[];
}

// ── Entity (single node + ancestors) ─────────────────────────────

export interface EntityAncestorRef {
  id: string;
  name: string;
}

export interface EntityCountryAncestor {
  id: string;
  name: string;
  code: string;
}

export interface EntityResponse {
  id: string;
  name: string;
  type: string;
  ancestors: {
    zone: EntityAncestorRef | null;
    city: EntityAncestorRef | null;
    state: EntityAncestorRef | null;
    country: EntityCountryAncestor | null;
  };
}

// ── DMC custom locations ─────────────────────────────────────────

export interface DmcCustomLocation {
  id: string;
  dmc_id: string;
  name: string;
  type: "city" | "zone" | "area" | "venue" | string | null;
  parent_geo_id: string | null;
  created_at: string;
}

export interface DmcCustomLocationCreateInput {
  name: string;
  type: "city" | "zone" | "area" | "venue";
  parent_geo_id: string;
}

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

export async function fetchCountryTree(
  countryId: string,
): Promise<Result<CountryTreeResponse>> {
  const raw = await http.get<CountryTreeResponse>(
    `/api/geo/countries/${countryId}/tree`,
  );
  return unwrap<CountryTreeResponse>(raw);
}

export async function listCountries(): Promise<Result<TransferCountryOption[]>> {
  const raw = await http.get<TransferCountryOption[]>("/api/geo/countries");
  return unwrap<TransferCountryOption[]>(raw);
}

export async function fetchEntity(id: string): Promise<Result<EntityResponse>> {
  const raw = await http.get<EntityResponse>(`/api/geo/entity/${id}`);
  return unwrap<EntityResponse>(raw);
}

export async function listCustomLocations(): Promise<Result<DmcCustomLocation[]>> {
  const raw = await http.get<DmcCustomLocation[]>("/api/geo/custom-locations");
  return unwrap<DmcCustomLocation[]>(raw);
}

export async function createCustomLocation(
  input: DmcCustomLocationCreateInput,
): Promise<Result<DmcCustomLocation>> {
  const raw = await http.post<DmcCustomLocation>(
    "/api/geo/custom-locations",
    input,
  );
  return unwrap<DmcCustomLocation>(raw);
}

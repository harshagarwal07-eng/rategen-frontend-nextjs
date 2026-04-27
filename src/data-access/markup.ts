"use client";

import http from "@/lib/api";
import type {
  ApiClient,
  CalculateMarkupInput,
  CreateApiClientInput,
  CreateBundleInput,
  CreateConfigInput,
  CreateMarketClusterInput,
  CreateOverrideInput,
  CreateSeasonInput,
  MarketCluster,
  MarkupBundle,
  MarkupConfig,
  MarkupConfigSummary,
  MarkupModifier,
  MarkupOverride,
  MarkupResult,
  Season,
  UpdateApiClientInput,
  UpdateBundleInput,
  UpdateConfigInput,
  UpdateMarketClusterInput,
  UpdateOverrideInput,
  UpdateSeasonInput,
  UpsertModifiersInput,
} from "@/types/markup";

export type Result<T> = { data: T | null; error: string | null };

// http helpers return raw JSON typed as ApiResponse<T> but the markup backend
// returns plain bodies (no {data,error} wrapper). On error the helper sets
// `.error`; otherwise the body IS the response — cast via unwrap.
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

// ─── Configs ───────────────────────────────────────────────────────────

export async function listMarkupConfigs(): Promise<Result<MarkupConfigSummary[]>> {
  const raw = await http.get<MarkupConfigSummary[]>("/api/markup/configs");
  return unwrap<MarkupConfigSummary[]>(raw);
}

export async function getMarkupConfig(id: string): Promise<Result<MarkupConfig>> {
  const raw = await http.get<MarkupConfig>(`/api/markup/configs/${id}`);
  return unwrap<MarkupConfig>(raw);
}

export async function createMarkupConfig(
  input: CreateConfigInput,
): Promise<Result<MarkupConfig>> {
  const raw = await http.post<MarkupConfig>("/api/markup/configs", input);
  return unwrap<MarkupConfig>(raw);
}

export async function updateMarkupConfig(
  id: string,
  input: UpdateConfigInput,
): Promise<Result<MarkupConfig>> {
  const raw = await http.patch<MarkupConfig>(`/api/markup/configs/${id}`, input);
  return unwrap<MarkupConfig>(raw);
}

export async function deleteMarkupConfig(id: string): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(`/api/markup/configs/${id}`);
  return unwrap<{ deleted: boolean }>(raw);
}

// ─── Modifiers (bulk upsert per type) ──────────────────────────────────

export async function listModifiers(configId: string): Promise<Result<MarkupModifier[]>> {
  const raw = await http.get<MarkupModifier[]>(
    `/api/markup/configs/${configId}/modifiers`,
  );
  return unwrap<MarkupModifier[]>(raw);
}

export async function upsertModifiers(
  configId: string,
  input: UpsertModifiersInput,
): Promise<Result<MarkupModifier[]>> {
  const raw = await http.post<MarkupModifier[]>(
    `/api/markup/configs/${configId}/modifiers`,
    input,
  );
  return unwrap<MarkupModifier[]>(raw);
}

export async function clearModifiers(
  configId: string,
  modifierType: string,
): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(
    `/api/markup/configs/${configId}/modifiers/${modifierType}`,
  );
  return unwrap<{ deleted: boolean }>(raw);
}

// ─── Overrides ─────────────────────────────────────────────────────────

export async function listOverrides(configId: string): Promise<Result<MarkupOverride[]>> {
  const raw = await http.get<MarkupOverride[]>(
    `/api/markup/configs/${configId}/overrides`,
  );
  return unwrap<MarkupOverride[]>(raw);
}

export async function createOverride(
  configId: string,
  input: CreateOverrideInput,
): Promise<Result<MarkupOverride>> {
  const raw = await http.post<MarkupOverride>(
    `/api/markup/configs/${configId}/overrides`,
    input,
  );
  return unwrap<MarkupOverride>(raw);
}

export async function updateOverride(
  configId: string,
  overrideId: string,
  input: UpdateOverrideInput,
): Promise<Result<MarkupOverride>> {
  const raw = await http.patch<MarkupOverride>(
    `/api/markup/configs/${configId}/overrides/${overrideId}`,
    input,
  );
  return unwrap<MarkupOverride>(raw);
}

export async function deleteOverride(
  configId: string,
  overrideId: string,
): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(
    `/api/markup/configs/${configId}/overrides/${overrideId}`,
  );
  return unwrap<{ deleted: boolean }>(raw);
}

// ─── Bundles ───────────────────────────────────────────────────────────

export async function listBundles(): Promise<Result<MarkupBundle[]>> {
  const raw = await http.get<MarkupBundle[]>("/api/markup/bundles");
  return unwrap<MarkupBundle[]>(raw);
}

export async function getBundle(id: string): Promise<Result<MarkupBundle>> {
  const raw = await http.get<MarkupBundle>(`/api/markup/bundles/${id}`);
  return unwrap<MarkupBundle>(raw);
}

export async function createBundle(
  input: CreateBundleInput,
): Promise<Result<MarkupBundle>> {
  const raw = await http.post<MarkupBundle>("/api/markup/bundles", input);
  return unwrap<MarkupBundle>(raw);
}

export async function updateBundle(
  id: string,
  input: UpdateBundleInput,
): Promise<Result<MarkupBundle>> {
  const raw = await http.patch<MarkupBundle>(`/api/markup/bundles/${id}`, input);
  return unwrap<MarkupBundle>(raw);
}

export async function deleteBundle(id: string): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(`/api/markup/bundles/${id}`);
  return unwrap<{ deleted: boolean }>(raw);
}

// ─── Market Clusters ───────────────────────────────────────────────────

export async function listMarketClusters(): Promise<Result<MarketCluster[]>> {
  const raw = await http.get<MarketCluster[]>("/api/markup/market-clusters");
  return unwrap<MarketCluster[]>(raw);
}

export async function createMarketCluster(
  input: CreateMarketClusterInput,
): Promise<Result<MarketCluster>> {
  const raw = await http.post<MarketCluster>("/api/markup/market-clusters", input);
  return unwrap<MarketCluster>(raw);
}

export async function updateMarketCluster(
  id: string,
  input: UpdateMarketClusterInput,
): Promise<Result<MarketCluster>> {
  const raw = await http.patch<MarketCluster>(
    `/api/markup/market-clusters/${id}`,
    input,
  );
  return unwrap<MarketCluster>(raw);
}

export async function deleteMarketCluster(id: string): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(
    `/api/markup/market-clusters/${id}`,
  );
  return unwrap<{ deleted: boolean }>(raw);
}

// ─── Seasons ───────────────────────────────────────────────────────────

export async function listSeasons(): Promise<Result<Season[]>> {
  const raw = await http.get<Season[]>("/api/markup/seasons");
  return unwrap<Season[]>(raw);
}

export async function createSeason(input: CreateSeasonInput): Promise<Result<Season>> {
  const raw = await http.post<Season>("/api/markup/seasons", input);
  return unwrap<Season>(raw);
}

export async function updateSeason(
  id: string,
  input: UpdateSeasonInput,
): Promise<Result<Season>> {
  const raw = await http.patch<Season>(`/api/markup/seasons/${id}`, input);
  return unwrap<Season>(raw);
}

export async function deleteSeason(id: string): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(`/api/markup/seasons/${id}`);
  return unwrap<{ deleted: boolean }>(raw);
}

// ─── API Clients ───────────────────────────────────────────────────────

export async function listApiClients(): Promise<Result<ApiClient[]>> {
  const raw = await http.get<ApiClient[]>("/api/markup/api-clients");
  return unwrap<ApiClient[]>(raw);
}

export async function createApiClient(
  input: CreateApiClientInput,
): Promise<Result<ApiClient>> {
  const raw = await http.post<ApiClient>("/api/markup/api-clients", input);
  return unwrap<ApiClient>(raw);
}

export async function updateApiClient(
  id: string,
  input: UpdateApiClientInput,
): Promise<Result<ApiClient>> {
  const raw = await http.patch<ApiClient>(`/api/markup/api-clients/${id}`, input);
  return unwrap<ApiClient>(raw);
}

export async function deleteApiClient(id: string): Promise<Result<{ deleted: boolean }>> {
  const raw = await http.delete<{ deleted: boolean }>(`/api/markup/api-clients/${id}`);
  return unwrap<{ deleted: boolean }>(raw);
}

// ─── Calculator ────────────────────────────────────────────────────────

export async function calculateMarkup(
  input: CalculateMarkupInput,
): Promise<Result<MarkupResult>> {
  const raw = await http.post<MarkupResult>("/api/markup/calculate", input);
  return unwrap<MarkupResult>(raw);
}

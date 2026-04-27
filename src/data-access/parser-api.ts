"use client";

/**
 * Tours/Transfers Parser API client (Phase 2.x).
 *
 * Mirrors the tours-api.ts / transfers-api.ts conventions:
 *   - All exports return Result<T> = { data: T | null; error: string | null }
 *   - Auth + envelope handling go through the shared `http` helper from @/lib/api
 *   - Multipart uploads use http.upload()
 *
 * Endpoints under /api/parser are defined by the backend ParserController
 * (backend/src/modules/parser/parser.controller.ts). Storage bucket and
 * server-side validation live there.
 */

import http from "@/lib/api";
import { env } from "@/lib/env";

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

// ─── Types (raw rows from the backend) ────────────────────────

export type ParseJobStatus =
  | "pending"
  | "parsing"
  | "completed"
  | "failed"
  | "fully_resolved";

export type SourceEntry = "tours" | "transfers";
export type PackageType = "tour" | "transfer";

export interface ParseJobRow {
  id: string;
  parent_parse_job_id: string | null;
  job_type: PackageType;
  source_entry: SourceEntry;
  dmc_id: string;
  country_code: string;
  state_id: string | null;
  city_geo_ids: string[] | null;
  filename: string;
  file_path: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  status: ParseJobStatus;
  current_phase: string | null;
  phase_progress: Record<string, unknown> | null;
  extraction_path: string | null;
  raw_text: string | null;
  total_tokens_used: number;
  error_message: string | null;
  parse_started_at: string | null;
  parse_completed_at: string | null;
  fully_resolved_at: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface ParseJobPackageRow {
  id: string;
  parse_job_id: string;
  package_type: PackageType;
  raw_index: number | null;
  parsed_data: Record<string, unknown>;
  catalog_match_id: string | null;
  catalog_match_score: number | null;
  geo_match: Record<string, unknown> | null;
  confidence_score: number;
  llm_confidence: number | null;
  heuristic_confidence: number | null;
  confidence_reasons: string[];
  heuristic_flags: string[];
  review_status: "pending" | "approved" | "rejected" | "saved";
  saved_entity_id: string | null;
  saved_at: string | null;
  save_error: string | null;
  last_edited_at: string | null;
  created_at: string;
  updated_at: string;
  parse_job_rates?: ParseJobRateRow[];
}

export interface ParseJobRateRow {
  id: string;
  parse_job_package_id: string;
  parsed_data: Record<string, unknown>;
  confidence_score: number;
  llm_confidence: number | null;
  heuristic_confidence: number | null;
  confidence_reasons: string[];
  heuristic_flags: string[];
  review_status: "pending" | "approved" | "rejected" | "saved";
  last_edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateJobResponse {
  job_id: string;
  status_url: string;
  stream_url: string;
}

export interface DeclaredContext {
  country: string;          // human-readable country name; backend resolves to ISO
  state: string | null;     // state uuid or null
  cities: string[];         // city geo uuids; may be empty
}

export interface SaveResultEntry {
  package_id: string;
  saved: boolean;
  entity_id?: string;
  error?: string;
}

// ─── Job CRUD ─────────────────────────────────────────────────

/**
 * Multipart upload: starts a new parse job. The server creates the
 * parse_jobs row, persists the file to storage, and kicks off the async
 * pipeline. Returns the new job id + stream URL the client should subscribe to.
 */
export async function createParserJob(
  file: File,
  declaredContext: DeclaredContext,
  sourceEntry: SourceEntry,
): Promise<Result<CreateJobResponse>> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("declared_context_json", JSON.stringify(declaredContext));
  fd.append("source_entry", sourceEntry);
  const raw = await http.upload<CreateJobResponse>("/api/parser/jobs", fd);
  return unwrap<CreateJobResponse>(raw);
}

export async function listParserJobs(
  source?: SourceEntry,
): Promise<Result<ParseJobRow[]>> {
  const url = source ? `/api/parser/jobs?source=${source}` : "/api/parser/jobs";
  const raw = await http.get<ParseJobRow[]>(url);
  return unwrap<ParseJobRow[]>(raw);
}

export async function getParserJob(jobId: string): Promise<
  Result<{ job: ParseJobRow; packages: ParseJobPackageRow[] }>
> {
  const raw = await http.get<{ job: ParseJobRow; packages: ParseJobPackageRow[] }>(
    `/api/parser/jobs/${jobId}`,
  );
  return unwrap<{ job: ParseJobRow; packages: ParseJobPackageRow[] }>(raw);
}

// ─── Save & PATCH ─────────────────────────────────────────────

export async function saveApprovedPackages(
  jobId: string,
  packageIds: string[],
): Promise<Result<{ results: SaveResultEntry[] }>> {
  const raw = await http.post<{ results: SaveResultEntry[] }>(
    `/api/parser/jobs/${jobId}/save`,
    { package_ids: packageIds },
  );
  return unwrap<{ results: SaveResultEntry[] }>(raw);
}

export async function patchParserPackage(
  jobId: string,
  packageId: string,
  patch: {
    parsed_data?: Record<string, unknown>;
    catalog_match_id?: string | null;
    geo_match?: Record<string, unknown> | null;
  },
): Promise<Result<{ ok: true }>> {
  const raw = await http.patch<{ ok: true }>(
    `/api/parser/jobs/${jobId}/packages/${packageId}`,
    patch,
  );
  return unwrap<{ ok: true }>(raw);
}

export async function patchParserPackageStatus(
  jobId: string,
  packageId: string,
  status: "approved" | "rejected",
): Promise<Result<{ ok: true }>> {
  const raw = await http.patch<{ ok: true }>(
    `/api/parser/jobs/${jobId}/packages/${packageId}/status`,
    { status },
  );
  return unwrap<{ ok: true }>(raw);
}

export async function patchParserRate(
  jobId: string,
  rateId: string,
  patch: {
    parsed_data?: Record<string, unknown>;
    review_status?: "approved" | "rejected" | "pending";
  },
): Promise<Result<{ ok: true }>> {
  const raw = await http.patch<{ ok: true }>(
    `/api/parser/jobs/${jobId}/rates/${rateId}`,
    patch,
  );
  return unwrap<{ ok: true }>(raw);
}

// ─── SSE stream URL helper ────────────────────────────────────

/**
 * Returns the absolute URL to the SSE stream endpoint. Caller passes this
 * to `new EventSource(...)`. Note: EventSource does NOT support custom
 * headers, so the backend stream endpoint must accept the JWT via cookie
 * or query string for auth. Today's parser stream endpoint is unauth in dev;
 * production wiring is part of the auth follow-up (parser-followups.md).
 */
export function parserStreamUrl(jobId: string): string {
  const base = env.API_URL.replace(/\/$/, "");
  return `${base}/api/parser/jobs/${jobId}/stream`;
}

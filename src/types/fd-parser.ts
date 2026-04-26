// Backend types for /api/fd-parser/*. The schema is owned by migration
// 037 (fd_parse_sessions) — see backend/sql/037_fd_parse_sessions_transform.sql.

import type {
  AddonsOutput,
  AutoImagesOutput,
  DeparturesPricingOutput,
  FlightsVisaTaxesOutput,
  InclusionsExclusionsOutput,
  ItineraryOutput,
  PoliciesOutput,
} from "@/components/rates/fixed-departures/parser/renderers/types";

export type FDParserSessionStatus =
  | "pending"
  | "extracting"
  | "parsing"
  | "ready_for_review"
  | "saved"
  | "saved_with_warnings"
  | "failed";

export interface FDParserPreParseInput {
  title: string;
  tour_code: string;
  duration_nights: number;
  duration_days: number;
  document_instructions: string | null;
  ai_remarks: string | null;
}

export interface FDParserStageOutputs {
  pdf_extract?: unknown;
  itinerary?: ItineraryOutput;
  inclusions_exclusions?: InclusionsExclusionsOutput;
  departures_pricing?: DeparturesPricingOutput;
  addons?: AddonsOutput;
  flights_visa_taxes?: FlightsVisaTaxesOutput;
  policies?: PoliciesOutput;
  auto_images?: AutoImagesOutput;
  [key: string]: unknown;
}

export interface FDParserSession {
  id: string;
  status: FDParserSessionStatus;
  pre_parse_input: FDParserPreParseInput | null;
  stage_outputs: FDParserStageOutputs | null;
  pdf_extraction: { markdown?: string } | null;
  errors: import("@/lib/fd-parser-errors").SessionErrorsShape | null;
  package_id: string | null;
  total_duration_ms: number | null;
  total_input_tokens: number | null;
  total_output_tokens: number | null;
  created_at: string;
  updated_at: string;
}

export interface FDParserSaveResponse {
  package_id: string;
  warnings?: import("@/lib/fd-parser-errors").GeoWarningRecord[];
  status?: FDParserSessionStatus;
}

export interface FDParserCreateResponse {
  session_id: string;
}

export const TERMINAL_STATUSES: ReadonlySet<FDParserSessionStatus> = new Set([
  "ready_for_review",
  "saved",
  "saved_with_warnings",
  "failed",
]);

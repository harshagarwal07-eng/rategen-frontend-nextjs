// Normalizes the shapes fd_parse_sessions.errors JSONB can hold:
//   - Legacy (pre-3c): { stage, message, at, error? }
//   - 3c+ stage errs:  { stage_errors: StageErrorRecord[], at }
//   - 3d+ save-time:   { warnings: GeoWarningRecord[], at }
// Both shapes can coexist in one row when stage errors and save warnings
// land in the same column; reader returns both arrays populated.

export interface StageErrorRecord {
  stage: string;
  message: string;
  at?: string;
  retried?: boolean;
}

export interface GeoWarningRecord {
  field: "country" | "city" | (string & {});
  value: string;
  message: string;
}

export interface SessionErrorsShape {
  stage?: string;
  message?: string;
  error?: string;
  at?: string;
  stage_errors?: unknown;
  warnings?: unknown;
}

export interface ParsedSessionErrors {
  stageErrors: StageErrorRecord[];
  warnings: GeoWarningRecord[];
}

export function readSessionErrors(
  raw: SessionErrorsShape | null | undefined,
): ParsedSessionErrors {
  if (!raw) return { stageErrors: [], warnings: [] };
  return {
    stageErrors: readStageErrorsFrom(raw),
    warnings: readWarningsFrom(raw),
  };
}

function readStageErrorsFrom(raw: SessionErrorsShape): StageErrorRecord[] {
  if (Array.isArray(raw.stage_errors)) {
    return raw.stage_errors.filter(isStageErrorRecord);
  }
  if (typeof raw.stage === "string" && typeof raw.message === "string") {
    return [{ stage: raw.stage, message: raw.message, at: raw.at }];
  }
  return [];
}

function readWarningsFrom(raw: SessionErrorsShape): GeoWarningRecord[] {
  if (!Array.isArray(raw.warnings)) return [];
  return raw.warnings.filter(isGeoWarningRecord);
}

function isStageErrorRecord(v: unknown): v is StageErrorRecord {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.stage === "string" && typeof o.message === "string";
}

function isGeoWarningRecord(v: unknown): v is GeoWarningRecord {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.field === "string" &&
    typeof o.value === "string" &&
    typeof o.message === "string"
  );
}

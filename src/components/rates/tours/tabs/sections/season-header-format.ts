// Builds the inline rate-summary string shown in a collapsed season
// header. Output shape mirrors the brief — Adult/Child/Infant for band
// rates, Npax for private per-pax, range-pax for tiered, vehicle name +
// rate for vehicle mode, and "USD 500 · max 20" for total mode.
//
// Pure function — no React, no fetches; callers pass in everything.

import type {
  TourPackageSalesMode,
  TourSeasonRateType,
} from "@/types/tours";
import type {
  PaxRateRow,
  PrivateCell,
  PrivateTierRow,
  VehicleRow,
} from "./season-rates-editor";

const MAX_ENTRIES = 5;

export interface SeasonHeaderInputs {
  rateType: TourSeasonRateType;
  salesMode: TourPackageSalesMode;
  privateMode: "per_pax" | "tiered";
  currency: string;
  paxRows: PaxRateRow[];
  privateCells: PrivateCell[];
  privateTierRows: PrivateTierRow[];
  vehicleRows: VehicleRow[];
  totalRate: string;
  totalMaxCapacity: string;
  vehicleLabelById: (id: string) => string | null;
}

function fmtRate(currency: string, value: number): string {
  return value === 0 ? "free" : `${currency} ${value}`;
}

function parseNum(s: string): number | null {
  if (s == null || s === "") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function joinWithMore(parts: string[], total: number): string {
  if (parts.length === 0) return "";
  if (total <= parts.length) return parts.join(" · ");
  return `${parts.join(" · ")} +${total - parts.length} more`;
}

export function formatSeasonHeader(inputs: SeasonHeaderInputs): string {
  const {
    rateType,
    salesMode,
    privateMode,
    currency,
    paxRows,
    privateCells,
    privateTierRows,
    vehicleRows,
    totalRate,
    totalMaxCapacity,
    vehicleLabelById,
  } = inputs;

  const cur = currency || "—";

  if (rateType === "total") {
    const rate = parseNum(totalRate);
    const cap = parseNum(totalMaxCapacity);
    if (rate == null && cap == null) return "";
    const parts: string[] = [];
    if (rate != null) parts.push(fmtRate(cur, rate));
    if (cap != null) parts.push(`max ${cap}`);
    return parts.join(" · ");
  }

  if (rateType === "vehicle") {
    const filled = vehicleRows.filter((r) => {
      const n = parseNum(r.rate);
      return r.vehicle_type_id && n != null;
    });
    if (filled.length === 0) return "";
    const parts = filled.slice(0, MAX_ENTRIES).map((r) => {
      const label = vehicleLabelById(r.vehicle_type_id) ?? "Vehicle";
      return `${label} ${fmtRate(cur, parseNum(r.rate) ?? 0)}`;
    });
    return joinWithMore(parts, filled.length);
  }

  // rateType === 'per_pax'
  if (salesMode === "ticket" || salesMode === "shared") {
    const filled = paxRows
      .map((r) => ({ band: r.band_name, rate: parseNum(r.rate) }))
      .filter((r) => r.rate != null);
    if (filled.length === 0) return "";
    const parts = filled.slice(0, MAX_ENTRIES).map(
      (r) => `${r.band} ${fmtRate(cur, r.rate ?? 0)}`,
    );
    return joinWithMore(parts, filled.length);
  }

  // private / exclusive
  if (privateMode === "tiered") {
    const filled = privateTierRows
      .map((t) => ({
        min: parseInt(t.min_pax, 10) || 0,
        max: parseInt(t.max_pax, 10) || 0,
        rate: parseNum(t.rate),
      }))
      .filter((t) => t.min > 0 && t.max >= t.min && t.rate != null)
      .sort((a, b) => a.min - b.min);
    if (filled.length === 0) return "";
    const parts = filled.slice(0, MAX_ENTRIES).map(
      (t) =>
        `${t.min === t.max ? `${t.min}pax` : `${t.min}-${t.max}pax`} ${fmtRate(cur, t.rate ?? 0)}`,
    );
    return joinWithMore(parts, filled.length);
  }

  // per-pax mode
  const filled = privateCells
    .map((c) => ({ pax: c.pax_count, rate: parseNum(c.rate) }))
    .filter((c) => c.rate != null)
    .sort((a, b) => a.pax - b.pax);
  if (filled.length === 0) return "";
  const parts = filled.slice(0, MAX_ENTRIES).map(
    (c) => `${c.pax}pax ${fmtRate(cur, c.rate ?? 0)}`,
  );
  return joinWithMore(parts, filled.length);
}

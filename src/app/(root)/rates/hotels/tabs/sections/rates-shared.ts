// Shared helpers + types for Hotel Tab 3 (Rates).
// Wire ↔ local-state conversion, dirty diffing, computed previews.

import type { AgePolicyBand, ContractRoom } from "@/types/contract-tab2";
import type {
  AgePricingPayloadItem,
  AgePricingRow,
  ContractRate,
  MealPlan,
  RatesPayloadItem,
} from "@/types/contract-rates";

// ─── Local editable state ────────────────────────────────────────────────

export type ExtraAdultType = "fixed" | "percentage";
export type RatePriceType = "fixed" | "percentage";

export interface LocalAgePricing {
  _localId: string;
  id: string | null;
  age_policy_id: string;
  is_free: boolean;
  max_free_count: number | null;
  without_bed_price: number | null;
  without_bed_price_type: RatePriceType;
  with_bed_price: number | null;
  with_bed_price_type: RatePriceType;
}

export interface LocalRate {
  _localId: string;
  id: string | null;
  room_category_id: string;
  season_id: string;
  meal_plan_id: string | null;
  meal_plan: string | null;
  rate_type: "PRPN" | "PPPN";
  room_rate: number | null;
  single_rate: number | null;
  double_rate: number | null;
  triple_rate: number | null;
  quad_rate: number | null;
  extra_adult_supplement: number | null;
  extra_adult_supplement_type: ExtraAdultType;
  valid_days: number[]; // [0..6], all 7 = every day
  status: "active" | "inactive";
  bar_rate: number | null;
  commission_percentage: number | null;
  age_pricing: LocalAgePricing[];
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

// ─── ID generators ────────────────────────────────────────────────────────

export const newRateLocalId = () => `rate-${crypto.randomUUID()}`;
export const newAgePricingLocalId = () => `ap-${crypto.randomUUID()}`;

// ─── Wire → local ────────────────────────────────────────────────────────

export function wrapAgePricing(rows: AgePricingRow[] | undefined | null): LocalAgePricing[] {
  return (rows ?? []).map((r) => ({
    _localId: newAgePricingLocalId(),
    id: r.id ?? null,
    age_policy_id: r.age_policy_id,
    is_free: !!r.is_free,
    max_free_count: r.max_free_count ?? null,
    without_bed_price: r.without_bed_price ?? null,
    without_bed_price_type:
      r.without_bed_price_type === "percentage" ? "percentage" : "fixed",
    with_bed_price: r.with_bed_price ?? null,
    with_bed_price_type:
      r.with_bed_price_type === "percentage" ? "percentage" : "fixed",
  }));
}

export function wrapRate(
  rate: ContractRate,
  fallbackRateType: "PRPN" | "PPPN"
): LocalRate {
  const rt: "PRPN" | "PPPN" =
    rate.rate_type === "PPPN" ? "PPPN" : rate.rate_type === "PRPN" ? "PRPN" : fallbackRateType;
  return {
    _localId: newRateLocalId(),
    id: rate.id,
    room_category_id: rate.room_category_id,
    season_id: rate.season_id,
    meal_plan_id: rate.meal_plan_id,
    meal_plan: rate.meal_plan,
    rate_type: rt,
    room_rate: rate.room_rate,
    single_rate: rate.single_rate,
    double_rate: rate.double_rate,
    triple_rate: rate.triple_rate,
    quad_rate: rate.quad_rate,
    extra_adult_supplement: rate.extra_adult_supplement,
    extra_adult_supplement_type:
      rate.extra_adult_supplement_type === "percentage" ? "percentage" : "fixed",
    valid_days:
      Array.isArray(rate.valid_days) && rate.valid_days.length > 0
        ? rate.valid_days.map((d) => Number(d))
        : [...ALL_DAYS],
    status: rate.status === "inactive" ? "inactive" : "active",
    bar_rate: rate.bar_rate,
    commission_percentage: rate.commission_percentage,
    age_pricing: wrapAgePricing(rate.age_pricing),
  };
}

// Build an empty (un-persisted) LocalRate for a (room, season) cell. Seeds
// child pricing from the rooms-scope age policies that have a band defined.
export function emptyRate(
  room: ContractRoom,
  seasonId: string,
  agePolicies: AgePolicyBand[],
  defaultMealPlan: MealPlan | null
): LocalRate {
  const rt: "PRPN" | "PPPN" = room.rate_type === "PPPN" ? "PPPN" : "PRPN";
  return {
    _localId: newRateLocalId(),
    id: null,
    room_category_id: room.id ?? "",
    season_id: seasonId,
    meal_plan_id: defaultMealPlan?.id ?? null,
    meal_plan: defaultMealPlan?.code ?? null,
    rate_type: rt,
    room_rate: null,
    single_rate: null,
    double_rate: null,
    triple_rate: null,
    quad_rate: null,
    extra_adult_supplement: null,
    extra_adult_supplement_type: "fixed",
    valid_days: [...ALL_DAYS],
    status: "active",
    bar_rate: null,
    commission_percentage: null,
    age_pricing: agePolicies
      .filter((b) => !!b.id)
      .map((b) => ({
        _localId: newAgePricingLocalId(),
        id: null,
        age_policy_id: b.id as string,
        is_free: false,
        max_free_count: null,
        without_bed_price: null,
        without_bed_price_type: "fixed",
        with_bed_price: null,
        with_bed_price_type: "fixed",
      })),
  };
}

// ─── Local → wire (PUT body) ─────────────────────────────────────────────

function maybe<T>(v: T | null | undefined): T | undefined {
  return v == null ? undefined : v;
}

function stripAgePricing(rows: LocalAgePricing[]): AgePricingPayloadItem[] {
  // Sort by age_policy_id so dirty diffing doesn't trip on incidental
  // re-ordering of the per-band rows.
  const sorted = [...rows].sort((a, b) =>
    a.age_policy_id.localeCompare(b.age_policy_id)
  );
  return sorted.map((r) => ({
    id: r.id ?? undefined,
    age_policy_id: r.age_policy_id,
    is_free: r.is_free,
    max_free_count: maybe(r.max_free_count),
    without_bed_price: maybe(r.without_bed_price),
    without_bed_price_type: r.without_bed_price_type,
    with_bed_price: maybe(r.with_bed_price),
    with_bed_price_type: r.with_bed_price_type,
  }));
}

// True when the local rate has *no* user-entered data and *no* server id —
// safe to drop from the PUT payload. Existing rates (id != null) are
// always sent so their delete vs. update is governed explicitly by the
// user touching them.
function isUntouched(r: LocalRate): boolean {
  if (r.id) return false;
  return (
    r.room_rate == null &&
    r.single_rate == null &&
    r.double_rate == null &&
    r.triple_rate == null &&
    r.quad_rate == null &&
    r.bar_rate == null &&
    r.commission_percentage == null &&
    r.extra_adult_supplement == null &&
    r.age_pricing.every(
      (a) =>
        !a.is_free &&
        a.max_free_count == null &&
        a.without_bed_price == null &&
        a.with_bed_price == null
    )
  );
}

// Project a LocalRate into the PUT payload shape. PPPN+BAR is suppressed at
// the call sites (UI disables the inputs); but to be defensive, we strip
// bar_rate / commission_percentage when rate_type is PPPN so the backend's
// PPPN-cannot-have-bar_rate validator is never triggered by accident.
export function stripRate(
  r: LocalRate,
  contractRateBasis: "net" | "bar"
): RatesPayloadItem {
  const isBar = contractRateBasis === "bar" && r.rate_type === "PRPN";

  const out: RatesPayloadItem = {
    id: r.id ?? undefined,
    room_category_id: r.room_category_id,
    season_id: r.season_id,
    meal_plan: r.meal_plan ?? undefined,
    meal_plan_id: r.meal_plan_id ?? undefined,
    rate_type: r.rate_type,
    extra_adult_supplement: maybe(r.extra_adult_supplement),
    extra_adult_supplement_type: r.extra_adult_supplement_type,
    valid_days: r.valid_days,
    status: r.status,
    age_pricing: stripAgePricing(r.age_pricing),
  };

  if (r.rate_type === "PRPN") {
    out.room_rate = maybe(r.room_rate);
    out.single_rate = maybe(r.single_rate);
    if (isBar) {
      out.bar_rate = maybe(r.bar_rate);
      out.commission_percentage = maybe(r.commission_percentage);
    }
  } else {
    out.single_rate = maybe(r.single_rate);
    out.double_rate = maybe(r.double_rate);
    out.triple_rate = maybe(r.triple_rate);
    out.quad_rate = maybe(r.quad_rate);
  }

  return out;
}

// ─── Computed display values ─────────────────────────────────────────────

export function computeNetFromBar(
  bar: number | null,
  commissionPct: number | null
): number | null {
  if (bar == null || commissionPct == null) return null;
  return bar * (1 - commissionPct / 100);
}

export function rateRowSummary(r: LocalRate, basis: "net" | "bar"): string | null {
  if (r.rate_type === "PRPN") {
    if (basis === "bar") {
      const net = computeNetFromBar(r.bar_rate, r.commission_percentage);
      if (r.bar_rate != null) {
        return net != null ? `BAR $${r.bar_rate} · Net $${net.toFixed(2)}` : `BAR $${r.bar_rate}`;
      }
      return r.room_rate != null ? `$${r.room_rate}` : null;
    }
    return r.room_rate != null ? `$${r.room_rate}` : null;
  }
  // PPPN — show smallest available occupancy.
  const v =
    r.single_rate ??
    r.double_rate ??
    r.triple_rate ??
    r.quad_rate;
  return v != null ? `$${v}` : null;
}

// What "rate value" to render in matrix/calendar cells.
export function rateCellValue(r: LocalRate, basis: "net" | "bar"): number | null {
  if (r.rate_type === "PRPN") {
    if (basis === "bar") {
      return computeNetFromBar(r.bar_rate, r.commission_percentage) ?? r.room_rate;
    }
    return r.room_rate;
  }
  return r.single_rate ?? r.double_rate ?? r.triple_rate ?? r.quad_rate;
}

// Truthy "this cell is rated" check. Brief: at least one of the rate fields
// is set. We don't enforce required combinations here.
export function isRated(r: LocalRate, basis: "net" | "bar"): boolean {
  if (r.rate_type === "PRPN") {
    if (basis === "bar") return r.bar_rate != null || r.room_rate != null;
    return r.room_rate != null;
  }
  return (
    r.single_rate != null ||
    r.double_rate != null ||
    r.triple_rate != null ||
    r.quad_rate != null
  );
}

// ─── Date helpers ────────────────────────────────────────────────────────

export function fmtDay(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fmtRange(r: { date_from: string; date_to: string }): string {
  return `${fmtDay(r.date_from)} – ${fmtDay(r.date_to)}`;
}

export const DAY_LABELS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Backend stores valid_days as int[] 0..6 (Mon=0). Convert to a Set for
// toggling in the UI.
export function daysToSet(days: number[] | null | undefined): Set<number> {
  if (!days || days.length === 0) return new Set(ALL_DAYS);
  return new Set(days);
}

export function setToDays(set: Set<number>): number[] {
  return Array.from(set).sort((a, b) => a - b);
}

export function formatDaysLabel(days: number[]): string {
  if (days.length === 7) return "Mon–Sun";
  return DAY_LABELS_SHORT.filter((_, i) => days.includes(i)).join(", ");
}

// ─── Tax filter for a given room ─────────────────────────────────────────

export interface TaxLite {
  name: string;
  rate: number;
  rate_type: "percentage" | "fixed";
  is_inclusive: boolean;
  applies_to_room_category_ids: string[];
}

export function taxesForRoom<T extends TaxLite>(taxes: T[], roomId: string): T[] {
  return taxes.filter(
    (t) =>
      !t.applies_to_room_category_ids ||
      t.applies_to_room_category_ids.length === 0 ||
      t.applies_to_room_category_ids.includes(roomId)
  );
}

export function formatTaxesSummary(taxes: TaxLite[]): string {
  return taxes
    .map((t) => {
      const value = t.rate_type === "percentage" ? `${t.rate}%` : `$${t.rate}`;
      return `${t.name} ${value} (${t.is_inclusive ? "inclusive" : "exclusive"})`;
    })
    .join(" · ");
}

// ─── Child-pricing subtitle ──────────────────────────────────────────────

export function childPricingSubtitle(room: ContractRoom): string {
  const parts: string[] = [];
  if (room.allow_children && (room.max_children ?? 0) > 0)
    parts.push(`Max ${room.max_children} children`);
  if (room.allow_infants && (room.max_infants ?? 0) > 0)
    parts.push(`Max ${room.max_infants} infants`);
  return parts.length === 0 ? "" : parts.join(" · ");
}

export function ageBandLabel(band: AgePolicyBand | undefined): string {
  if (!band) return "—";
  const cap = band.label.charAt(0).toUpperCase() + band.label.slice(1);
  return `${cap} (${band.age_from}–${band.age_to})`;
}

// ─── Build full payload for PUT (the whole contract's rates) ─────────────

export function stripAllRates(
  rates: LocalRate[],
  basis: "net" | "bar"
): RatesPayloadItem[] {
  return rates.filter((r) => !isUntouched(r)).map((r) => stripRate(r, basis));
}

// JSON snapshot of the full rate set, used by parent for dirty detection.
// Drops untouched-and-unsaved rates so transient empty seeds don't dirty.
export function snapshotRates(rates: LocalRate[], basis: "net" | "bar"): string {
  const filtered = rates.filter((r) => !isUntouched(r));
  // Stable sort by (room, season) so reordering doesn't dirty.
  const sorted = [...filtered].sort((a, b) =>
    a.room_category_id !== b.room_category_id
      ? a.room_category_id.localeCompare(b.room_category_id)
      : a.season_id.localeCompare(b.season_id)
  );
  return JSON.stringify(sorted.map((r) => stripRate(r, basis)));
}

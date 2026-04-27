// Shared types + helpers for Tab 4 Supplements local state.

import {
  SupplementChargeBasis,
  SupplementChargeFrequency,
  SupplementDateRange,
  SupplementDetail,
  SupplementStatus,
  SupplementTripType,
  SupplementType,
} from "@/types/contract-supplements";

export interface LocalDateRange {
  _localId: string;
  date_from: string;
  date_to: string;
}

export interface LocalAgePricing {
  _localId: string;
  id: string | null;
  age_policy_id: string | null;
  // Legacy contract from old_frontend: when picking a fresh age band the user
  // chooses by label/from-to and we lazy-create an age_policy on save. The
  // backend supplement age-pricing replace endpoint requires age_policy_id, so
  // unsaved rows must resolve to a real id at save time.
  label: string;
  age_from: number;
  age_to: number;
  is_free: boolean;
  price: number | null;
  price_type: "fixed" | "percentage" | null;
}

export interface LocalSupplement {
  _localId: string;
  id: string | null;
  contract_id: string;
  name: string;
  supplement_type: SupplementType;
  is_mandatory: boolean;
  is_combinable: boolean;
  charge_basis: SupplementChargeBasis;
  charge_frequency: SupplementChargeFrequency;
  market_id: string | null;
  minimum_stay: number;
  status: SupplementStatus;
  trip_type: SupplementTripType | null;
  meal_plan_id: string | null;
  flat_amount: number | null;
  flat_amount_type: "fixed" | "percentage" | null;

  // Primary period stays denormalised on the row.
  valid_from: string | null;
  valid_till: string | null;
  booking_from: string | null;
  booking_till: string | null;
  // Extra valid/booking ranges live in supplement_date_ranges.
  valid_ranges: LocalDateRange[];
  booking_ranges: LocalDateRange[];

  // Sub-tables.
  room_category_ids: string[]; // empty = all rooms
  meal_plans: string[]; // codes (RO/BB/HB/...) — only for transfer
  age_pricing: LocalAgePricing[];
  // Tax links: parallel arrays mirroring old_frontend's data shape so the
  // checkbox + Incl/Excl switch stay decoupled.
  contract_tax_ids: string[];
  contract_tax_inclusive: Record<string, boolean>;

  // UI-only.
  isNew: boolean;
}

export const SUPPLEMENT_TYPE_LABELS: Record<SupplementType, string> = {
  meal_plan: "Meal Plan",
  transfer: "Transfer",
  other: "Other",
};

export const SUPPLEMENT_TYPE_BADGE: Record<SupplementType, string> = {
  meal_plan: "bg-blue-100 text-blue-800",
  transfer: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-700",
};

export const MEAL_PLAN_CODES = ["RO", "BB", "HB", "FB", "AI"] as const;
export const AGE_LABELS = ["infant", "child", "teen", "adult"] as const;

export const newLocalId = () => `supp-${crypto.randomUUID()}`;
export const newRangeLocalId = () => `range-${crypto.randomUUID()}`;
export const newAgePricingLocalId = () => `ap-${crypto.randomUUID()}`;

// Auto-detect Christmas Gala / New Year Gala windows for a given contract
// stay period. Uses the SEEDED meal-plan codes (XM-GD / NY-GD) — old_frontend
// had 'CDG'/'NYG' which never matched real data. After backend mig 108 the
// codes are now 'CDG'/'NYG' (renamed in mig 108). Either way we accept both
// forms to be safe.
export function computeGalaDates(
  code: string,
  stayFrom: string | null | undefined,
  stayTill: string | null | undefined
): LocalDateRange[] {
  if (!stayFrom || !stayTill) return [];
  const isXmas = code === "CDG" || code === "XM-GD";
  const isNewYear = code === "NYG" || code === "NY-GD";
  if (!isXmas && !isNewYear) return [];

  const from = parseIsoLocal(stayFrom);
  const tillBoundary = parseIsoLocal(stayTill);
  if (!from || !tillBoundary) return [];
  const startYear = from.getFullYear();
  const endYear = tillBoundary.getFullYear();
  const ranges: LocalDateRange[] = [];

  for (let y = startYear; y <= endYear; y++) {
    let df: string;
    let dt: string;
    if (isXmas) {
      df = `${y}-12-24`;
      dt = `${y}-12-25`;
    } else {
      df = `${y}-12-31`;
      dt = `${y + 1}-01-01`;
    }
    const dfDate = parseIsoLocal(df);
    const dtDate = parseIsoLocal(dt);
    if (!dfDate || !dtDate) continue;
    if (dfDate >= from && dtDate <= tillBoundary) {
      ranges.push({ _localId: newRangeLocalId(), date_from: df, date_to: dt });
    }
  }
  return ranges;
}

function parseIsoLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function blankSupplement(
  contractId: string,
  type: SupplementType,
  contract?: {
    stay_valid_from: string | null;
    stay_valid_till: string | null;
    booking_valid_from: string | null;
    booking_valid_till: string | null;
  } | null
): LocalSupplement {
  return {
    _localId: newLocalId(),
    id: null,
    contract_id: contractId,
    name: "",
    supplement_type: type,
    is_mandatory: false,
    is_combinable: true,
    charge_basis: "per_person",
    charge_frequency: "per_night",
    market_id: null,
    minimum_stay: 1,
    status: "active",
    trip_type: type === "transfer" ? "one_way" : null,
    meal_plan_id: null,
    flat_amount: null,
    flat_amount_type: null,
    valid_from: contract?.stay_valid_from ?? null,
    valid_till: contract?.stay_valid_till ?? null,
    booking_from: contract?.booking_valid_from ?? null,
    booking_till: contract?.booking_valid_till ?? null,
    valid_ranges: [],
    booking_ranges: [],
    room_category_ids: [],
    meal_plans: [],
    age_pricing: [],
    contract_tax_ids: [],
    contract_tax_inclusive: {},
    isNew: true,
  };
}

export function wrapSupplement(detail: SupplementDetail): LocalSupplement {
  const dr = detail.date_ranges ?? [];
  const validExtras = dr
    .filter((r) => r.range_type === "valid")
    .map<LocalDateRange>((r) => ({
      _localId: newRangeLocalId(),
      date_from: r.date_from,
      date_to: r.date_to,
    }));
  const bookingExtras = dr
    .filter((r) => r.range_type === "booking")
    .map<LocalDateRange>((r) => ({
      _localId: newRangeLocalId(),
      date_from: r.date_from,
      date_to: r.date_to,
    }));
  const taxIds = (detail.contract_taxes ?? []).map((t) => t.contract_tax_id);
  const taxInclusive: Record<string, boolean> = {};
  for (const t of detail.contract_taxes ?? []) {
    taxInclusive[t.contract_tax_id] = !!t.is_inclusive;
  }

  return {
    _localId: newLocalId(),
    id: detail.id,
    contract_id: detail.contract_id,
    name: detail.name,
    supplement_type: detail.supplement_type,
    is_mandatory: !!detail.is_mandatory,
    is_combinable: !!detail.is_combinable,
    charge_basis:
      detail.charge_basis === "per_room" ? "per_room" : "per_person",
    charge_frequency:
      detail.charge_frequency === "per_stay" ? "per_stay" : "per_night",
    market_id: detail.market_id ?? null,
    minimum_stay: detail.minimum_stay ?? 1,
    status: detail.status === "inactive" ? "inactive" : "active",
    trip_type:
      detail.trip_type === "round_trip"
        ? "round_trip"
        : detail.trip_type === "one_way"
          ? "one_way"
          : null,
    meal_plan_id: detail.meal_plan_id ?? null,
    flat_amount: detail.flat_amount ?? null,
    flat_amount_type:
      detail.flat_amount_type === "percentage"
        ? "percentage"
        : detail.flat_amount_type === "fixed"
          ? "fixed"
          : null,
    valid_from: detail.valid_from,
    valid_till: detail.valid_till,
    booking_from: detail.booking_from,
    booking_till: detail.booking_till,
    valid_ranges: validExtras,
    booking_ranges: bookingExtras,
    room_category_ids: (detail.room_categories ?? []).map(
      (r) => r.room_category_id
    ),
    meal_plans: (detail.meal_plans ?? []).map((m) => m.meal_plan),
    age_pricing: (detail.age_pricing ?? []).map<LocalAgePricing>((ap) => ({
      _localId: newAgePricingLocalId(),
      id: ap.id ?? null,
      age_policy_id: ap.age_policy_id ?? null,
      label: "",
      age_from: 0,
      age_to: 99,
      is_free: !!ap.is_free,
      price: ap.price ?? null,
      price_type:
        ap.price_type === "percentage"
          ? "percentage"
          : ap.price_type === "fixed"
            ? "fixed"
            : null,
    })),
    contract_tax_ids: taxIds,
    contract_tax_inclusive: taxInclusive,
    isNew: false,
  };
}

export interface DateRangeBundle {
  primary: { date_from: string | null; date_to: string | null };
  extras: LocalDateRange[];
}

export function flattenForDisplay(
  bundle: DateRangeBundle
): LocalDateRange[] {
  const all: LocalDateRange[] = [];
  if (
    bundle.primary.date_from != null ||
    bundle.primary.date_to != null ||
    bundle.extras.length > 0
  ) {
    all.push({
      _localId: "primary",
      date_from: bundle.primary.date_from ?? "",
      date_to: bundle.primary.date_to ?? "",
    });
  }
  for (const r of bundle.extras) all.push(r);
  return all;
}

export function unflattenFromDisplay(
  flat: LocalDateRange[]
): DateRangeBundle {
  if (flat.length === 0) {
    return { primary: { date_from: null, date_to: null }, extras: [] };
  }
  const [first, ...rest] = flat;
  return {
    primary: {
      date_from: first.date_from || null,
      date_to: first.date_to || null,
    },
    extras: rest.map((r) =>
      r._localId === "primary" ? { ...r, _localId: newRangeLocalId() } : r
    ),
  };
}

export function snapshotSupplement(s: LocalSupplement): string {
  const stripped = {
    id: s.id,
    name: s.name.trim(),
    supplement_type: s.supplement_type,
    is_mandatory: s.is_mandatory,
    is_combinable: s.is_combinable,
    charge_basis: s.charge_basis,
    charge_frequency: s.charge_frequency,
    market_id: s.market_id,
    minimum_stay: s.minimum_stay,
    status: s.status,
    trip_type: s.supplement_type === "transfer" ? s.trip_type : null,
    meal_plan_id: s.supplement_type === "meal_plan" ? s.meal_plan_id : null,
    flat_amount: s.charge_basis === "per_room" ? s.flat_amount : null,
    flat_amount_type:
      s.charge_basis === "per_room" ? s.flat_amount_type : null,
    valid_from: s.valid_from,
    valid_till: s.valid_till,
    booking_from: s.booking_from,
    booking_till: s.booking_till,
    valid_ranges: s.valid_ranges
      .filter((r) => r.date_from && r.date_to)
      .map((r) => ({ date_from: r.date_from, date_to: r.date_to })),
    booking_ranges: s.booking_ranges
      .filter((r) => r.date_from && r.date_to)
      .map((r) => ({ date_from: r.date_from, date_to: r.date_to })),
    room_category_ids: [...s.room_category_ids].sort(),
    meal_plans: [...s.meal_plans].sort(),
    age_pricing: s.age_pricing.map((ap) => ({
      age_policy_id: ap.age_policy_id,
      label: ap.label,
      age_from: ap.age_from,
      age_to: ap.age_to,
      is_free: ap.is_free,
      price: ap.is_free ? null : ap.price,
      price_type: ap.is_free ? null : ap.price_type,
    })),
    contract_tax_ids: [...s.contract_tax_ids].sort(),
    contract_tax_inclusive: s.contract_tax_ids
      .slice()
      .sort()
      .map((id) => [id, !!s.contract_tax_inclusive[id]]),
  };
  return JSON.stringify(stripped);
}

export type DateRangePayload = Pick<
  SupplementDateRange,
  "range_type" | "date_from" | "date_to"
>;

export function buildDateRangePayload(s: LocalSupplement): DateRangePayload[] {
  return [
    ...s.valid_ranges
      .filter((r) => r.date_from && r.date_to)
      .map<DateRangePayload>((r) => ({
        range_type: "valid",
        date_from: r.date_from,
        date_to: r.date_to,
      })),
    ...s.booking_ranges
      .filter((r) => r.date_from && r.date_to)
      .map<DateRangePayload>((r) => ({
        range_type: "booking",
        date_from: r.date_from,
        date_to: r.date_to,
      })),
  ];
}

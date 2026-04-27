// Shared types + helpers for Tab 5 Offers/Perks local state.

import {
  OfferCancellationRule,
  OfferDateRange,
  OfferDateRangeType,
  OfferDetail,
  OfferDiscountAppliesTo,
  OfferDiscountBasis,
  OfferDiscountType,
  OfferStatus,
  OfferType,
} from "@/types/contract-offers";
import { PerkDetail, PerkStatus } from "@/types/contract-perks";

export interface LocalDateRange {
  _localId: string;
  date_from: string;
  date_to: string;
}

export interface LocalCancellationRule {
  _localId: string;
  id: string | null;
  days_from: number | null;
  days_to: number | null;
  anchor: "checkin_date" | "booking_date";
  is_no_show: boolean;
  charge_type: "percentage" | "nights";
  charge_value: number;
}

export interface LocalOfferPerk {
  _localId: string;
  id: string | null;
  name: string;
  inclusions: string[];
  max_pax: number | null;
  min_age: number | null;
  max_age: number | null;
  minimum_stay: number | null;
}

export interface LocalOffer {
  _localId: string;
  // Saved-side id. Null until first save.
  id: string | null;
  contract_id: string;
  offer_type: OfferType;
  name: string;
  code: string | null;
  priority: number;
  valid_from: string | null;
  valid_till: string | null;
  booking_from: string | null;
  booking_till: string | null;
  market_id: string | null;
  discount_applies_to: OfferDiscountAppliesTo;
  max_discounted_adults: number | null;
  apply_on_extra_bed: boolean;
  apply_on_extra_meal: boolean;
  is_combinable: boolean;
  is_non_refundable: boolean;
  status: OfferStatus;

  // Type-specific fields (subset persisted on the row + per-type sub-table).
  discount_value: number | null;
  discount_type: OfferDiscountType | null;
  discount_basis: OfferDiscountBasis | null;
  minimum_stay: number | null;
  book_before_days: number | null;
  minimum_nights: number | null;
  stay_nights: number | null;
  pay_nights: number | null;
  minimum_adults: number | null;
  minimum_children: number | null;
  description: string | null;

  // Multi-period date storage. Primary = denormalized scalars (valid_from/till
  // and booking_from/till). Extras live in *_ranges; blackouts are extras only
  // (no denorm scalar).
  valid_ranges: LocalDateRange[];
  booking_ranges: LocalDateRange[];
  blackout_ranges: LocalDateRange[];

  // Scope.
  room_category_ids: string[]; // empty = all rooms
  meal_plans: string[]; // codes (RO/BB/HB/...) — empty = all meal plans

  // Sub-tables.
  cancellation_rules: LocalCancellationRule[];
  perks: LocalOfferPerk[];

  // Combinations. Element is *either* a real offer.id or a sibling _localId
  // for unsaved partner offers — resolved at save time.
  combinations: string[];

  isNew: boolean;
}

export interface LocalPerk {
  _localId: string;
  id: string | null;
  contract_id: string;
  name: string;
  inclusions: string[];
  valid_from: string | null;
  valid_till: string | null;
  market_id: string | null;
  status: PerkStatus;
  max_pax: number | null;
  min_age: number | null;
  max_age: number | null;
  minimum_stay: number | null;
  room_category_ids: string[];
  isNew: boolean;
}

export const OFFER_TYPES: { value: OfferType; label: string }[] = [
  { value: "early_bird", label: "Early Bird" },
  { value: "long_stay", label: "Long Stay" },
  { value: "free_night", label: "Free Night" },
  { value: "honeymoon", label: "Honeymoon" },
  { value: "family", label: "Family" },
  { value: "repeater", label: "Repeater" },
  { value: "custom", label: "Custom" },
];

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  early_bird: "Early Bird",
  long_stay: "Long Stay",
  free_night: "Free Night",
  honeymoon: "Honeymoon",
  family: "Family",
  repeater: "Repeater",
  custom: "Custom",
};

export const OFFER_TYPE_BADGE: Record<OfferType, string> = {
  early_bird: "bg-amber-100 text-amber-800",
  long_stay: "bg-blue-100 text-blue-800",
  free_night: "bg-purple-100 text-purple-800",
  honeymoon: "bg-pink-100 text-pink-800",
  family: "bg-green-100 text-green-800",
  repeater: "bg-teal-100 text-teal-800",
  custom: "bg-gray-100 text-gray-700",
};

export const OFFER_NAME_PLACEHOLDERS: Record<OfferType, string> = {
  early_bird: "e.g. Early Bird 60 Days",
  long_stay: "e.g. Long Stay 7 Nights",
  free_night: "e.g. Stay 7 Pay 6",
  honeymoon: "e.g. Honeymoon Package",
  family: "e.g. Family Offer",
  repeater: "e.g. Returning Guest Offer",
  custom: "e.g. Summer Escape",
};

export const newOfferLocalId = () => `offer-${crypto.randomUUID()}`;
export const newPerkLocalId = () => `perk-${crypto.randomUUID()}`;
export const newRangeLocalId = () => `range-${crypto.randomUUID()}`;
export const newRuleLocalId = () => `rule-${crypto.randomUUID()}`;
export const newOfferPerkLocalId = () => `oferk-${crypto.randomUUID()}`;

export function blankOffer(
  contractId: string,
  offerType: OfferType
): LocalOffer {
  return {
    _localId: newOfferLocalId(),
    id: null,
    contract_id: contractId,
    offer_type: offerType,
    name: "",
    code: null,
    priority: 1,
    valid_from: null,
    valid_till: null,
    booking_from: null,
    booking_till: null,
    market_id: null,
    discount_applies_to: "adults_only",
    max_discounted_adults: null,
    apply_on_extra_bed: false,
    apply_on_extra_meal: false,
    is_combinable: false,
    is_non_refundable: false,
    status: "active",
    discount_value: null,
    discount_type: "percentage",
    discount_basis: "per_stay",
    minimum_stay: null,
    book_before_days: null,
    minimum_nights: null,
    stay_nights: null,
    pay_nights: null,
    minimum_adults: null,
    minimum_children: null,
    description: null,
    valid_ranges: [],
    booking_ranges: [],
    blackout_ranges: [],
    room_category_ids: [],
    meal_plans: [],
    cancellation_rules: [],
    perks: [],
    combinations: [],
    isNew: true,
  };
}

export function blankPerk(contractId: string): LocalPerk {
  return {
    _localId: newPerkLocalId(),
    id: null,
    contract_id: contractId,
    name: "",
    inclusions: [],
    valid_from: null,
    valid_till: null,
    market_id: null,
    status: "active",
    max_pax: null,
    min_age: null,
    max_age: null,
    minimum_stay: null,
    room_category_ids: [],
    isNew: true,
  };
}

export function wrapOffer(
  detail: OfferDetail,
  attachedPerks: PerkDetail[]
): LocalOffer {
  const drExtras = (detail.date_ranges ?? []).filter((r) => {
    // Primary period sits on the row; backend does NOT denormalize extras into
    // date_ranges.valid alongside primary, so every row is an extra. To match
    // old_frontend semantics, keep them all as extras.
    return r.range_type === "valid" || r.range_type === "booking";
  });
  const validExtras = drExtras
    .filter((r) => r.range_type === "valid")
    .map<LocalDateRange>((r) => ({
      _localId: newRangeLocalId(),
      date_from: r.date_from,
      date_to: r.date_to,
    }));
  const bookingExtras = drExtras
    .filter((r) => r.range_type === "booking")
    .map<LocalDateRange>((r) => ({
      _localId: newRangeLocalId(),
      date_from: r.date_from,
      date_to: r.date_to,
    }));
  const blackoutExtras = (detail.date_ranges ?? [])
    .filter((r) => r.range_type === "blackout")
    .map<LocalDateRange>((r) => ({
      _localId: newRangeLocalId(),
      date_from: r.date_from,
      date_to: r.date_to,
    }));

  // Type-specific data merge — backend stores per-type rows in sub-tables.
  // For UI simplicity we read the first row of the relevant sub-table to
  // populate the in-memory fields. The base offer row also has these fields,
  // so for new offers we still write the base row and a single sub-table row
  // mirroring it.
  const earlyBird = detail.early_bird?.[0];
  const longStay = detail.long_stay?.[0];
  const freeNight = detail.free_night?.[0];
  const honeymoon = detail.honeymoon?.[0];
  const family = detail.family?.[0];
  const repeater = detail.repeater?.[0];
  const custom = detail.custom?.[0];

  // Resolve type-specific fields with a fall-back to the base row.
  const ts = (() => {
    switch (detail.offer_type) {
      case "early_bird":
        return {
          discount_value:
            earlyBird?.discount_value ?? detail.discount_value ?? null,
          discount_type:
            earlyBird?.discount_type ?? detail.discount_type ?? "percentage",
          minimum_stay:
            earlyBird?.minimum_stay ?? null,
          book_before_days:
            earlyBird?.book_before_days ?? detail.book_before_days ?? null,
        };
      case "long_stay":
        return {
          discount_value:
            longStay?.discount_value ?? detail.discount_value ?? null,
          discount_type:
            longStay?.discount_type ?? detail.discount_type ?? "percentage",
          minimum_nights:
            longStay?.minimum_nights ?? detail.minimum_nights ?? null,
        };
      case "free_night":
        return {
          stay_nights: freeNight?.stay_nights ?? detail.stay_nights ?? null,
          pay_nights: freeNight?.pay_nights ?? detail.pay_nights ?? null,
          minimum_stay: freeNight?.minimum_stay ?? null,
        };
      case "honeymoon":
        return {
          discount_value:
            honeymoon?.discount_value ?? detail.discount_value ?? null,
          discount_type:
            honeymoon?.discount_type ?? detail.discount_type ?? "percentage",
          minimum_stay: honeymoon?.minimum_stay ?? null,
        };
      case "family":
        return {
          discount_value:
            family?.discount_value ?? detail.discount_value ?? null,
          discount_type:
            family?.discount_type ?? detail.discount_type ?? "percentage",
          minimum_adults:
            family?.minimum_adults ?? detail.minimum_adults ?? null,
          minimum_children:
            family?.minimum_children ?? detail.minimum_children ?? null,
          minimum_stay: family?.minimum_stay ?? null,
        };
      case "repeater":
        return {
          discount_value:
            repeater?.discount_value ?? detail.discount_value ?? null,
          discount_type:
            repeater?.discount_type ?? detail.discount_type ?? "percentage",
          minimum_stay: repeater?.minimum_stay ?? null,
        };
      case "custom":
        return {
          description: custom?.description ?? null,
          discount_value:
            custom?.discount_value ?? detail.discount_value ?? null,
          discount_type:
            custom?.discount_type ?? detail.discount_type ?? "percentage",
          minimum_stay: custom?.minimum_stay ?? null,
        };
      default:
        return {};
    }
  })();

  return {
    _localId: newOfferLocalId(),
    id: detail.id,
    contract_id: detail.contract_id,
    offer_type: detail.offer_type,
    name: detail.name,
    code: detail.code,
    priority: detail.priority ?? 1,
    valid_from: detail.valid_from,
    valid_till: detail.valid_till,
    booking_from: detail.booking_from,
    booking_till: detail.booking_till,
    market_id: detail.market_id,
    discount_applies_to:
      detail.discount_applies_to === "adults_and_children"
        ? "adults_and_children"
        : "adults_only",
    max_discounted_adults: detail.max_discounted_adults,
    apply_on_extra_bed: !!detail.apply_on_extra_bed,
    apply_on_extra_meal: !!detail.apply_on_extra_meal,
    is_combinable: !!detail.is_combinable,
    is_non_refundable: !!detail.is_non_refundable,
    status: detail.status === "inactive" ? "inactive" : "active",

    discount_value: detail.discount_value ?? null,
    discount_type:
      detail.discount_type === "fixed"
        ? "fixed"
        : detail.discount_type === "percentage"
          ? "percentage"
          : "percentage",
    discount_basis: (detail.discount_basis as OfferDiscountBasis) ?? "per_stay",
    minimum_stay: null,
    book_before_days: detail.book_before_days ?? null,
    minimum_nights: detail.minimum_nights ?? null,
    stay_nights: detail.stay_nights ?? null,
    pay_nights: detail.pay_nights ?? null,
    minimum_adults: detail.minimum_adults ?? null,
    minimum_children: detail.minimum_children ?? null,
    description: null,
    ...ts,

    valid_ranges: validExtras,
    booking_ranges: bookingExtras,
    blackout_ranges: blackoutExtras,

    room_category_ids: (detail.room_categories ?? []).map(
      (r) => r.room_category_id
    ),
    meal_plans: (detail.meal_plans ?? []).map((m) => m.meal_plan),

    cancellation_rules: (detail.cancellation_policy ?? [])
      // The non-refundable shortcut row lives in this same table; we hide it
      // from the rules editor and rely on the boolean toggle instead.
      .filter((r) => !r.is_non_refundable)
      .map<LocalCancellationRule>((r) => ({
        _localId: newRuleLocalId(),
        id: r.id ?? null,
        days_from: r.days_from,
        days_to: r.days_to,
        anchor:
          r.anchor === "booking_date" ? "booking_date" : "checkin_date",
        is_no_show: !!r.is_no_show,
        charge_type: r.charge_type === "nights" ? "nights" : "percentage",
        charge_value: r.charge_value ?? 0,
      })),
    perks: attachedPerks.map<LocalOfferPerk>((p) => ({
      _localId: newOfferPerkLocalId(),
      id: p.id,
      name: p.name,
      inclusions: p.inclusions ?? [],
      max_pax: p.max_pax,
      min_age: p.min_age,
      max_age: p.max_age,
      minimum_stay: p.minimum_stay,
    })),
    combinations: detail.combinations ?? [],
    isNew: false,
  };
}

export function wrapPerk(detail: PerkDetail): LocalPerk {
  return {
    _localId: newPerkLocalId(),
    id: detail.id,
    contract_id: detail.contract_id,
    name: detail.name,
    inclusions: detail.inclusions ?? [],
    valid_from: detail.valid_from,
    valid_till: detail.valid_till,
    market_id: detail.market_id,
    status: detail.status === "inactive" ? "inactive" : "active",
    max_pax: detail.max_pax,
    min_age: detail.min_age,
    max_age: detail.max_age,
    minimum_stay: detail.minimum_stay,
    room_category_ids: (detail.room_categories ?? []).map(
      (r) => r.room_category_id
    ),
    isNew: false,
  };
}

export function snapshotOffer(o: LocalOffer): string {
  // Deterministic serialization for dirty diffing.
  const stripped = {
    id: o.id,
    offer_type: o.offer_type,
    name: o.name.trim(),
    code: o.code?.trim() || null,
    priority: o.priority,
    valid_from: o.valid_from,
    valid_till: o.valid_till,
    booking_from: o.booking_from,
    booking_till: o.booking_till,
    market_id: o.market_id,
    discount_applies_to: o.discount_applies_to,
    max_discounted_adults: o.max_discounted_adults,
    apply_on_extra_bed: o.apply_on_extra_bed,
    apply_on_extra_meal: o.apply_on_extra_meal,
    is_combinable: o.is_combinable,
    is_non_refundable: o.is_non_refundable,
    status: o.status,
    discount_value: o.discount_value,
    discount_type: o.discount_type,
    discount_basis: o.discount_basis,
    minimum_stay: o.minimum_stay,
    book_before_days: o.book_before_days,
    minimum_nights: o.minimum_nights,
    stay_nights: o.stay_nights,
    pay_nights: o.pay_nights,
    minimum_adults: o.minimum_adults,
    minimum_children: o.minimum_children,
    description: o.description,
    valid_ranges: o.valid_ranges
      .filter((r) => r.date_from && r.date_to)
      .map((r) => ({ date_from: r.date_from, date_to: r.date_to })),
    booking_ranges: o.booking_ranges
      .filter((r) => r.date_from && r.date_to)
      .map((r) => ({ date_from: r.date_from, date_to: r.date_to })),
    blackout_ranges: o.blackout_ranges
      .filter((r) => r.date_from && r.date_to)
      .map((r) => ({ date_from: r.date_from, date_to: r.date_to })),
    room_category_ids: [...o.room_category_ids].sort(),
    meal_plans: [...o.meal_plans].sort(),
    cancellation_rules: o.cancellation_rules.map((r) => ({
      days_from: r.days_from,
      days_to: r.days_to,
      anchor: r.anchor,
      is_no_show: r.is_no_show,
      charge_type: r.charge_type,
      charge_value: r.charge_value,
    })),
    perks: o.perks.map((p) => ({
      id: p.id,
      name: p.name.trim(),
      inclusions: [...p.inclusions],
      max_pax: p.max_pax,
      min_age: p.min_age,
      max_age: p.max_age,
      minimum_stay: p.minimum_stay,
    })),
    combinations: [...o.combinations].sort(),
  };
  return JSON.stringify(stripped);
}

export function snapshotPerk(p: LocalPerk): string {
  const stripped = {
    id: p.id,
    name: p.name.trim(),
    inclusions: [...p.inclusions],
    valid_from: p.valid_from,
    valid_till: p.valid_till,
    market_id: p.market_id,
    status: p.status,
    max_pax: p.max_pax,
    min_age: p.min_age,
    max_age: p.max_age,
    minimum_stay: p.minimum_stay,
    room_category_ids: [...p.room_category_ids].sort(),
  };
  return JSON.stringify(stripped);
}

// Build the OfferDateRanges payload from the local offer's three range buckets.
// Primary period stays on the offers row (handled by base CRUD); extras and
// all blackouts go through this endpoint.
export function buildOfferDateRangePayload(
  o: LocalOffer
): Array<Pick<OfferDateRange, "range_type" | "date_from" | "date_to">> {
  const rows: Array<{
    range_type: OfferDateRangeType;
    date_from: string;
    date_to: string;
  }> = [];
  for (const r of o.valid_ranges) {
    if (!r.date_from || !r.date_to) continue;
    rows.push({
      range_type: "valid",
      date_from: r.date_from,
      date_to: r.date_to,
    });
  }
  for (const r of o.booking_ranges) {
    if (!r.date_from || !r.date_to) continue;
    rows.push({
      range_type: "booking",
      date_from: r.date_from,
      date_to: r.date_to,
    });
  }
  for (const r of o.blackout_ranges) {
    if (!r.date_from || !r.date_to) continue;
    rows.push({
      range_type: "blackout",
      date_from: r.date_from,
      date_to: r.date_to,
    });
  }
  return rows;
}

// Cancellation policy items — emit either the non-refundable shortcut row OR
// the user-defined tiered rules. Mirrors old_frontend's logic.
export function buildCancellationPolicyPayload(
  o: LocalOffer
): Array<Omit<OfferCancellationRule, "id">> {
  if (o.is_non_refundable) {
    return [
      {
        days_from: 0,
        days_to: 9999,
        anchor: "checkin_date",
        is_non_refundable: true,
        is_no_show: false,
        charge_type: "percentage",
        charge_value: 100,
      },
    ];
  }
  return o.cancellation_rules.map<Omit<OfferCancellationRule, "id">>((r) => ({
    days_from: r.days_from ?? 0,
    days_to: r.days_to ?? 0,
    anchor: r.anchor,
    is_non_refundable: false,
    is_no_show: r.is_no_show,
    charge_type: r.charge_type,
    charge_value: r.charge_value,
  }));
}

// Type-specific sub-table payload — single-row replace, derived from the
// in-memory offer fields.
export function buildTypeSpecificPayload(o: LocalOffer): {
  endpoint: OfferType;
  items: Array<Record<string, unknown>>;
} {
  switch (o.offer_type) {
    case "early_bird":
      return {
        endpoint: "early_bird",
        items: [
          omitNulls({
            book_before_days: o.book_before_days,
            discount_value: o.discount_value,
            discount_type: o.discount_type,
            minimum_stay: o.minimum_stay,
          }),
        ],
      };
    case "long_stay":
      return {
        endpoint: "long_stay",
        items: [
          omitNulls({
            minimum_nights: o.minimum_nights,
            discount_value: o.discount_value,
            discount_type: o.discount_type,
          }),
        ],
      };
    case "free_night":
      return {
        endpoint: "free_night",
        items: [
          omitNulls({
            stay_nights: o.stay_nights,
            pay_nights: o.pay_nights,
            minimum_stay: o.minimum_stay,
          }),
        ],
      };
    case "honeymoon":
      return {
        endpoint: "honeymoon",
        items: [
          omitNulls({
            discount_value: o.discount_value,
            discount_type: o.discount_type,
            minimum_stay: o.minimum_stay,
          }),
        ],
      };
    case "family":
      return {
        endpoint: "family",
        items: [
          omitNulls({
            discount_value: o.discount_value,
            discount_type: o.discount_type,
            minimum_adults: o.minimum_adults,
            minimum_children: o.minimum_children,
            minimum_stay: o.minimum_stay,
          }),
        ],
      };
    case "repeater":
      return {
        endpoint: "repeater",
        items: [
          omitNulls({
            discount_value: o.discount_value,
            discount_type: o.discount_type,
            minimum_stay: o.minimum_stay,
          }),
        ],
      };
    case "custom":
      return {
        endpoint: "custom",
        items: [
          omitNulls({
            description: o.description,
            discount_value: o.discount_value,
            discount_type: o.discount_type,
            minimum_stay: o.minimum_stay,
          }),
        ],
      };
  }
}

function omitNulls(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

import { differenceInCalendarDays, parseISO } from "date-fns";
import type { FDDeparture } from "@/types/fixed-departures";
import {
  EMPTY_LAND_PRICING,
  type LandPricingState,
} from "./departure-pricing-section";
import type { AddonOverrideState } from "./departure-addon-pricing-section";
import {
  computeCutoffDate,
  computeReturnDate,
  type DepartureFormState,
} from "./departure-form";

export const DEFAULT_DURATION = 7;
export const DEFAULT_TOTAL_SEATS = 40;

export function pricingFromServer(d: FDDeparture): LandPricingState {
  const land = (d.fd_departure_pricing ?? []).find((p) => p.pricing_type === "land_only");
  if (!land) return { ...EMPTY_LAND_PRICING };
  return {
    rate_single: land.rate_single,
    rate_double: land.rate_double,
    rate_triple: land.rate_triple,
    rate_child_no_bed: land.rate_child_no_bed,
    rate_child_extra_bed: land.rate_child_extra_bed,
    rate_infant: land.rate_infant,
  };
}

export function addonOverridesFromServer(d: FDDeparture): AddonOverrideState[] {
  const rows = d.fd_addon_departure_pricing ?? [];
  return rows.map((r) => {
    const hasAnyRate = [
      r.rate_single,
      r.rate_double,
      r.rate_triple,
      r.rate_child_no_bed,
      r.rate_child_extra_bed,
      r.rate_infant,
    ].some((v) => v != null);
    return {
      addon_id: r.addon_id,
      enabled: hasAnyRate,
      rate_single: r.rate_single,
      rate_double: r.rate_double,
      rate_triple: r.rate_triple,
      rate_child_no_bed: r.rate_child_no_bed,
      rate_child_extra_bed: r.rate_child_extra_bed,
      rate_infant: r.rate_infant,
    };
  });
}

export function departureToFormState(d: FDDeparture): DepartureFormState {
  const duration =
    d.departure_date && d.return_date
      ? Math.max(0, differenceInCalendarDays(parseISO(d.return_date), parseISO(d.departure_date)))
      : DEFAULT_DURATION;
  return {
    departure_date: d.departure_date ?? "",
    duration,
    return_date: d.return_date ?? "",
    cutoff_date: d.cutoff_date ?? "",
    cutoff_overridden:
      !!d.cutoff_date &&
      !!d.departure_date &&
      d.cutoff_date !== computeCutoffDate(d.departure_date),
    total_seats: d.total_seats,
    seats_sold: d.seats_sold,
    seats_on_hold: d.seats_on_hold,
    min_pax: d.min_pax,
    max_pax: d.max_pax,
    departure_status: d.departure_status ?? "planned",
    availability_status: d.availability_status ?? "available",
    internal_notes: d.internal_notes ?? "",
    pricing: pricingFromServer(d),
    addon_overrides: addonOverridesFromServer(d),
  };
}

export function emptyDepartureFormState(
  packageDuration: number,
  initialDate?: string,
): DepartureFormState {
  const departureDate = initialDate ?? "";
  return {
    departure_date: departureDate,
    duration: packageDuration,
    return_date: departureDate ? computeReturnDate(departureDate, packageDuration) : "",
    cutoff_date: departureDate ? computeCutoffDate(departureDate) : "",
    cutoff_overridden: false,
    total_seats: DEFAULT_TOTAL_SEATS,
    seats_sold: 0,
    seats_on_hold: 0,
    min_pax: 1,
    max_pax: null,
    departure_status: "planned",
    availability_status: "available",
    internal_notes: "",
    pricing: { ...EMPTY_LAND_PRICING },
    addon_overrides: [],
  };
}

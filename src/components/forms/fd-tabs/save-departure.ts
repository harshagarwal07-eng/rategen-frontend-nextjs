import {
  fdCreateDeparture,
  fdUpdateDeparture,
  fdUpsertDeparturePricing,
  fdUpsertAddonDeparturePricing,
  fdUpsertFlightPricing,
  fdReplaceDepartureCommissions,
} from "@/data-access/fixed-departures";
import type { FDAddon, FDDeparture } from "@/types/fixed-departures";
import type { DepartureFormState } from "./departure-form";

export type DepartureSaveResult =
  | { success: true; saved: FDDeparture }
  | { success: false; error: string };

interface SaveOptions {
  packageId: string;
  state: DepartureFormState;
  existingId?: string;
  addons: FDAddon[];
}

/**
 * Persist a single departure: POST or PATCH the departure, then PUT pricing,
 * then PUT addon pricing for any addons whose row is present in
 * `state.addon_overrides`. Toggle-OFF rows are sent with all-null rates since
 * the backend has no DELETE endpoint for addon pricing.
 */
export async function saveDeparture({
  packageId,
  state,
  existingId,
  addons,
}: SaveOptions): Promise<DepartureSaveResult> {
  const departurePayload: Partial<FDDeparture> = {
    departure_date: state.departure_date,
    return_date: state.return_date || null,
    cutoff_date: state.cutoff_date || null,
    total_seats: state.total_seats,
    seats_sold: state.seats_sold,
    seats_on_hold: state.seats_on_hold,
    min_pax: state.min_pax,
    max_pax: state.max_pax,
    departure_status: state.departure_status || null,
    availability_status: state.availability_status || null,
    internal_notes: state.internal_notes || null,
    is_commissionable: state.commission.is_commissionable,
    apply_land_commission_to_addons: state.commission.apply_land_commission_to_addons,
    room_sharing_enabled: state.commission.room_sharing_enabled,
    same_gender_sharing: state.commission.same_gender_sharing,
  };

  try {
    const saved = existingId
      ? await fdUpdateDeparture(existingId, departurePayload)
      : await fdCreateDeparture(packageId, departurePayload);

    // Commission rows are saved unconditionally so values aren't lost across
    // is_commissionable toggles. The flag alone gates whether commissions are
    // applied at quote time.
    await fdReplaceDepartureCommissions(
      saved.id,
      state.commission.rows.map((r) => ({
        component: r.component,
        age_band: r.age_band,
        commission_type: r.commission_type,
        commission_value: r.commission_value,
      })),
    );

    await fdUpsertDeparturePricing(saved.id, {
      pricing_type: "land_only",
      ...state.pricing,
    });

    // Toggle-OFF rows still get sent with all-null overrides since the backend
    // has no DELETE endpoint for addon pricing. Legacy occupancy columns are
    // always nulled — those columns were never populated and the new shape
    // lives on override_price_*.
    const addonRows = state.addon_overrides
      .filter((o) => addons.some((a) => a.id === o.addon_id))
      .map((o) => ({
        addon_id: o.addon_id,
        rate_single: null,
        rate_double: null,
        rate_triple: null,
        rate_child_no_bed: null,
        rate_child_extra_bed: null,
        rate_infant: null,
        override_price_adult: o.enabled ? o.override_price_adult : null,
        override_price_child: o.enabled ? o.override_price_child : null,
        override_price_infant: o.enabled ? o.override_price_infant : null,
        override_price_total: o.enabled ? o.override_price_total : null,
      }));
    if (addonRows.length > 0) {
      await fdUpsertAddonDeparturePricing(saved.id, addonRows);
    }

    // Flight pricing: one upsert per group. Groups removed from Tab 5 are
    // dropped silently — stale rows in fd_flight_pricing remain (no DELETE
    // endpoint). Empty groups (all-null prices) are still upserted so the
    // user can clear values.
    for (const row of state.flight_pricing) {
      if (!row.flight_group) continue;
      await fdUpsertFlightPricing(saved.id, {
        flight_group: row.flight_group,
        price_adult: row.price_adult,
        price_child: row.price_child,
        price_infant: row.price_infant,
      });
    }

    return { success: true, saved };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Save failed",
    };
  }
}

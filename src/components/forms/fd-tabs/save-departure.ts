import {
  fdCreateDeparture,
  fdUpdateDeparture,
  fdUpsertDeparturePricing,
  fdUpsertAddonDeparturePricing,
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
  };

  try {
    const saved = existingId
      ? await fdUpdateDeparture(existingId, departurePayload)
      : await fdCreateDeparture(packageId, departurePayload);

    await fdUpsertDeparturePricing(saved.id, {
      pricing_type: "land_only",
      ...state.pricing,
    });

    const addonRows = state.addon_overrides
      .filter((o) => addons.some((a) => a.id === o.addon_id))
      .map((o) => ({
        addon_id: o.addon_id,
        rate_single: o.enabled ? o.rate_single : null,
        rate_double: o.enabled ? o.rate_double : null,
        rate_triple: o.enabled ? o.rate_triple : null,
        rate_child_no_bed: o.enabled ? o.rate_child_no_bed : null,
        rate_child_extra_bed: o.enabled ? o.rate_child_extra_bed : null,
        rate_infant: o.enabled ? o.rate_infant : null,
      }));
    if (addonRows.length > 0) {
      await fdUpsertAddonDeparturePricing(saved.id, addonRows);
    }

    return { success: true, saved };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Save failed",
    };
  }
}

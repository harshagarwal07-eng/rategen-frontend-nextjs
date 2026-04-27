// Shared types for the geo picker modal. Kept minimal — kinds are driven
// by the registry pattern in `index.tsx`, so adding a new kind (hotel,
// airport, station, port, attraction) means only adding a registry entry
// without touching the shell.

import type { ComponentType } from "react";

// Discriminated union of selection kinds. Mirrors the backend's
// `transfer_package_stop_locations` row shape: `kind: 'geo'` writes to
// `geo_id`, `kind: 'dmc_custom'` writes to `dmc_custom_location_id`.
//
// `country_id` / `country_name` are display-only metadata so chips can
// show a country prefix when a selection is from a country other than
// the transfer's primary one. Cross-country selections are persisted
// through the picker by id alone — country ancestry is implicit in the
// geo node's hierarchy on the backend.
export type GeoSelection =
  | {
      kind: "geo";
      id: string;
      // Breadcrumb relative to the country (e.g. "Dubai › Marina"). The
      // chip renderer prepends a country prefix when needed; storing it
      // raw here keeps the same selection useful in both modal contexts.
      label?: string;
      nodeType?: "city" | "zone" | "area";
      country_id?: string;
      country_name?: string;
    }
  | {
      kind: "dmc_custom";
      id: string;
      label?: string;
      // Country of the anchor (custom locations themselves don't have a
      // country column — it's derived from `parent_geo_id` → cities).
      country_id?: string;
      country_name?: string;
    }
  | {
      // Master-catalog attraction. `id` is master_catalog.id; `geo_id`
      // is the row's parent city — consumers that store a geo node FK
      // (e.g. tour_packages.primary_geo_id) should resolve through that.
      kind: "attraction";
      id: string;
      label?: string;
      geo_id?: string | null;
      country_id?: string;
      country_name?: string;
    }
  | {
      kind: "activity";
      id: string;
      label?: string;
      geo_id?: string | null;
      country_id?: string;
      country_name?: string;
    };

/** Country codes whose master-data tabs (attraction, activity, hotel
 *  later) are populated. Tabs gated by this list show "Coming soon"
 *  for any other country. */
export const MASTER_DATA_COUNTRIES = ["AE", "SG", "ID", "MU"] as const;

export function selectionKey(s: GeoSelection): string {
  return `${s.kind}:${s.id}`;
}

export interface GeoPickerKindContentProps {
  // The country whose data this kind should currently render. May differ
  // from the transfer's primary country when the user switches countries
  // inside the modal.
  activeCountryId: string;
  selections: GeoSelection[];
  onChange: (next: GeoSelection[]) => void;
  search: string;
}

export interface GeoPickerKind {
  id: string;
  label: string;
  // Lucide icon component — pass the component type, not an element.
  Icon: ComponentType<{ className?: string }>;
  enabled: boolean;
  // Disabled tabs surface this hover hint.
  comingSoonHint?: string;
  // Rendered when this kind is the active tab. Receives the full selections
  // array (across kinds) and is expected to return the next array. Each kind
  // should only mutate its own entries; the shell merges shared state.
  Content?: ComponentType<GeoPickerKindContentProps>;
}

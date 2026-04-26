// Shared types for the geo picker modal. Kept minimal — kinds are driven
// by the registry pattern in `index.tsx`, so adding a new kind (hotel,
// airport, station, port, attraction) means only adding a registry entry
// without touching the shell.

import type { ComponentType } from "react";

// Discriminated union of selection kinds. Mirrors the backend's
// `transfer_package_stop_locations` row shape: `kind: 'geo'` writes to
// `geo_id`, `kind: 'dmc_custom'` writes to `dmc_custom_location_id`.
export type GeoSelection =
  | {
      kind: "geo";
      id: string;
      // Display-only — the leaf node's name plus a breadcrumb to its top
      // city. Hydrated from the tree on selection or via /api/geo/entity/:id
      // when re-opening saved selections.
      label?: string;
      // Type from the cities table — useful to show in chips ("Marina (zone)")
      // and to filter when searching.
      nodeType?: "city" | "zone" | "area";
    }
  | {
      kind: "dmc_custom";
      id: string;
      label?: string;
    };

export function selectionKey(s: GeoSelection): string {
  return `${s.kind}:${s.id}`;
}

export interface GeoPickerKindContentProps {
  countryId: string;
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

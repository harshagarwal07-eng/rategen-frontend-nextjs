"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MapPin, X } from "lucide-react";
import { MultiSelectSearch, MultiSelectOption } from "@/components/ui/multi-select-search";
import GeoPickerModal, {
  type GeoSelection,
} from "@/components/shared/geo-picker-modal";
import {
  fetchEntity,
  listCustomLocations,
} from "@/data-access/geo-picker-api";
import { PackageStop } from "@/types/transfers";

export type ViaRow = {
  _key: string;
  notes: string;
  geo_ids: string[];
};

// Origin and destination now hold polymorphic selections (geo nodes from the
// cities tree OR DMC custom locations). Via stops stay on the legacy flat
// search picker for now — separate workstream.
export type StopsState = {
  origin: GeoSelection[];
  destination: GeoSelection[];
  via: ViaRow[];
};

export type StopsLabelMap = Record<string, string>;

interface StopsSectionProps {
  initialStops?: PackageStop[];
  value: StopsState;
  onChange: (next: StopsState) => void;
  countryId: string | null;
}

interface GeoNode {
  id: string;
  name: string;
  ancestors?: Array<{ id: string; name: string; type: string }>;
}

function nodeLabel(n: GeoNode): string {
  return n.ancestors?.length
    ? `${n.name} • ${n.ancestors.map((a) => a.name).join(" • ")}`
    : n.name;
}

async function fetchGeoNodes(q: string): Promise<MultiSelectOption[]> {
  if (!q.trim()) return [];
  const res = await fetch(`/api/geo/nodes/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const nodes: GeoNode[] = await res.json();
  return nodes.map((n) => ({ id: n.id, label: nodeLabel(n) }));
}

async function fetchGeoNodeById(id: string): Promise<{ id: string; label: string } | null> {
  try {
    const res = await fetch(`/api/geo/nodes/${id}`);
    if (!res.ok) return null;
    const n: GeoNode = await res.json();
    return { id: n.id, label: nodeLabel(n) };
  } catch {
    return null;
  }
}

// Convert backend stop rows into the UI state. Origins and destinations are
// now arrays of GeoSelection ({ kind, id, label? }). Via stops stay on flat
// id arrays. Stops that share the same notes (or both empty) collapse into
// one via row — that's the round-trip contract.
export function deriveStopsState(stops?: PackageStop[]): StopsState {
  const out: StopsState = { origin: [], destination: [], via: [] };
  if (!stops) return out;

  const viaGroups = new Map<string, ViaRow>();

  for (const s of stops) {
    // Build (kind, id) pairs from each location row. Both `geo_id` and
    // `dmc_custom_location_id` map to selectable kinds; `master_catalog_id`
    // is recognised but not yet exposed in the UI.
    const sels: GeoSelection[] = [];
    const viaIds: string[] = [];
    for (const loc of s.transfer_package_stop_locations ?? []) {
      if (loc.geo_id) {
        sels.push({ kind: "geo", id: loc.geo_id });
        viaIds.push(loc.geo_id);
      } else if (loc.dmc_custom_location_id) {
        sels.push({ kind: "dmc_custom", id: loc.dmc_custom_location_id });
      }
    }
    for (const loc of s.locations ?? []) {
      if (loc.kind === "geo") {
        sels.push({ kind: "geo", id: loc.id });
        viaIds.push(loc.id);
      } else if (loc.kind === "dmc_custom") {
        sels.push({ kind: "dmc_custom", id: loc.id });
      }
    }

    if (s.stop_type === "origin") {
      out.origin.push(...sels);
    } else if (s.stop_type === "destination") {
      out.destination.push(...sels);
    } else if (s.stop_type === "via") {
      // Via stops only support geo for now — drop other kinds defensively.
      const key = (s.notes ?? "").trim();
      const existing = viaGroups.get(key);
      if (existing) {
        existing.geo_ids.push(...viaIds);
      } else {
        viaGroups.set(key, {
          _key: `via-${viaGroups.size}-${Date.now()}`,
          notes: s.notes ?? "",
          geo_ids: viaIds,
        });
      }
    }
  }

  out.via = Array.from(viaGroups.values());
  return out;
}

// UI state → backend payload. One stop row per (type, location) pair so each
// stop is independently reorderable. Origins first, then via rows in the
// order the user added them, then destinations.
export function buildStopsPayload(state: StopsState) {
  const rows: Array<{
    stop_order: number;
    stop_type: "origin" | "via" | "destination";
    notes?: string | null;
    locations: Array<{ kind: "geo" | "dmc_custom"; id: string }>;
  }> = [];
  let stop_order = 1;

  for (const sel of state.origin) {
    rows.push({
      stop_order: stop_order++,
      stop_type: "origin",
      locations: [{ kind: sel.kind, id: sel.id }],
    });
  }
  for (const row of state.via) {
    const notes = row.notes.trim() || null;
    for (const id of row.geo_ids) {
      rows.push({
        stop_order: stop_order++,
        stop_type: "via",
        notes,
        locations: [{ kind: "geo", id }],
      });
    }
  }
  for (const sel of state.destination) {
    rows.push({
      stop_order: stop_order++,
      stop_type: "destination",
      locations: [{ kind: sel.kind, id: sel.id }],
    });
  }
  return rows;
}

// ── Label & country hydration cache (module-scoped, keyed by `${kind}:${id}`).
// Keeps re-fetches bounded across multiple stops sections on the page.
type HydratedMeta = {
  label?: string;
  country_id?: string;
  country_name?: string;
};
const metaCache = new Map<string, HydratedMeta>();
const customListCache = { fetched: false };

function selKey(s: GeoSelection): string {
  return `${s.kind}:${s.id}`;
}

async function hydrateMeta(
  selections: GeoSelection[],
): Promise<Record<string, HydratedMeta>> {
  const out: Record<string, HydratedMeta> = {};
  const needGeo: string[] = [];
  const needCustom: string[] = [];

  for (const s of selections) {
    const key = selKey(s);
    // Selections coming back from the modal carry their own label +
    // country fields; cache them and skip the network round-trip.
    if (s.label || s.country_id) {
      const meta: HydratedMeta = {
        label: s.label,
        country_id: s.country_id,
        country_name: s.country_name,
      };
      metaCache.set(key, { ...metaCache.get(key), ...meta });
      out[key] = metaCache.get(key)!;
      continue;
    }
    const cached = metaCache.get(key);
    if (cached?.label) {
      out[key] = cached;
      continue;
    }
    if (s.kind === "geo") needGeo.push(s.id);
    else if (s.kind === "dmc_custom") needCustom.push(s.id);
  }

  // Fetch geo entities (with ancestors) in parallel. Each returns the leaf
  // breadcrumb plus a country ancestor we use for cross-country chips.
  if (needGeo.length > 0) {
    const fetched = await Promise.all(
      needGeo.map(async (id) => {
        const r = await fetchEntity(id);
        if (!r.data) return [id, null as HydratedMeta | null] as const;
        const a = r.data.ancestors;
        const parts = [r.data.name];
        if (a.zone) parts.unshift(a.zone.name);
        if (a.city) parts.unshift(a.city.name);
        const meta: HydratedMeta = {
          label: parts.join(" › "),
          country_id: a.country?.id,
          country_name: a.country?.name,
        };
        return [id, meta] as const;
      }),
    );
    for (const [id, meta] of fetched) {
      if (!meta) continue;
      const key = `geo:${id}`;
      metaCache.set(key, { ...metaCache.get(key), ...meta });
      out[key] = metaCache.get(key)!;
    }
  }

  // Custom locations: fetch the DMC list once for the name, then resolve
  // each anchor's country via the entity endpoint (in parallel).
  if (needCustom.length > 0) {
    if (!customListCache.fetched) {
      const r = await listCustomLocations();
      customListCache.fetched = true;
      if (r.data) {
        for (const loc of r.data) {
          const key = `dmc_custom:${loc.id}`;
          const prior = metaCache.get(key) ?? {};
          metaCache.set(key, { ...prior, label: loc.name });
        }
      }
    }
    // Resolve each custom location's anchor country once, in parallel.
    // Re-fetching the list to read parent_geo_id keeps this scoped here.
    const list = (await listCustomLocations()).data ?? [];
    const byId = new Map(list.map((l) => [l.id, l] as const));
    const anchorIds = Array.from(
      new Set(
        needCustom
          .map((id) => byId.get(id)?.parent_geo_id)
          .filter((v): v is string => Boolean(v)),
      ),
    );
    const resolved = await Promise.all(
      anchorIds.map(async (anchorId) => {
        const r = await fetchEntity(anchorId);
        const c = r.data?.ancestors.country ?? null;
        return [anchorId, c] as const;
      }),
    );
    const anchorCountry = new Map(resolved);
    for (const id of needCustom) {
      const key = `dmc_custom:${id}`;
      const loc = byId.get(id);
      const c = loc?.parent_geo_id
        ? anchorCountry.get(loc.parent_geo_id) ?? null
        : null;
      const meta: HydratedMeta = {
        label: metaCache.get(key)?.label ?? loc?.name,
        country_id: c?.id,
        country_name: c?.name,
      };
      metaCache.set(key, { ...metaCache.get(key), ...meta });
      out[key] = metaCache.get(key)!;
    }
  }

  return out;
}

interface FieldProps {
  label: string;
  selections: GeoSelection[];
  metaMap: Record<string, HydratedMeta>;
  onChange: (next: GeoSelection[]) => void;
  countryId: string | null;
  placeholder: string;
}

function chipText(s: GeoSelection, meta: HydratedMeta | undefined, primaryCountryId: string | null): string {
  const base = s.label ?? meta?.label ?? "Loading…";
  const countryId = s.country_id ?? meta?.country_id;
  const countryName = s.country_name ?? meta?.country_name;
  // Show country prefix only when the selection is from a country other
  // than the transfer's primary one. Same-country chips stay short.
  if (countryName && countryId && primaryCountryId && countryId !== primaryCountryId) {
    return `${countryName} › ${base}`;
  }
  return base;
}

function GeoSelectionField({
  label,
  selections,
  metaMap,
  onChange,
  countryId,
  placeholder,
}: FieldProps) {
  const [open, setOpen] = useState(false);
  const disabled = !countryId;
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="w-full min-h-9 rounded-md border bg-background px-2 py-1 text-left text-sm hover:bg-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
        title={disabled ? "Pick a country in Tab 1 first" : undefined}
      >
        {selections.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selections.map((s) => {
              const key = selKey(s);
              const text = chipText(s, metaMap[key], countryId);
              return (
                <Badge
                  key={key}
                  variant="secondary"
                  className="gap-1 pr-1 max-w-full"
                >
                  {s.kind === "dmc_custom" && (
                    <MapPin className="h-3 w-3 opacity-70" />
                  )}
                  <span className="truncate">{text}</span>
                  <span
                    role="button"
                    aria-label={`Remove ${text}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(
                        selections.filter(
                          (p) => !(p.kind === s.kind && p.id === s.id),
                        ),
                      );
                    }}
                    className="ml-0.5 rounded hover:bg-destructive/10 hover:text-destructive p-0.5 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              );
            })}
          </div>
        )}
      </button>
      <GeoPickerModal
        open={open}
        onOpenChange={setOpen}
        countryId={countryId}
        fieldLabel={label}
        initialSelections={selections}
        onApply={(next) => {
          // Carry resolved labels from the picker forward so the chip can
          // render without an extra fetch.
          for (const s of next) {
            const key = selKey(s);
            const prior = metaCache.get(key) ?? {};
            metaCache.set(key, {
              ...prior,
              label: s.label ?? prior.label,
              country_id: s.country_id ?? prior.country_id,
              country_name: s.country_name ?? prior.country_name,
            });
          }
          onChange(next);
        }}
      />
    </div>
  );
}

export default function StopsSection({
  initialStops,
  value,
  onChange,
  countryId,
}: StopsSectionProps) {
  const [metaMap, setMetaMap] = useState<Record<string, HydratedMeta>>({});

  // Hydrate labels + country metadata for pre-selected items.
  useEffect(() => {
    const all: GeoSelection[] = [...value.origin, ...value.destination];
    if (all.length === 0) return;
    let cancelled = false;
    (async () => {
      const fetched = await hydrateMeta(all);
      if (cancelled) return;
      setMetaMap((prev) => ({ ...prev, ...fetched }));
    })();
    return () => {
      cancelled = true;
    };
  }, [value.origin, value.destination]);

  // Via geo_ids hydration uses the legacy fetcher (separate label map kept
  // alongside via UI for back-compat).
  const [viaLabelMap, setViaLabelMap] = useState<StopsLabelMap>({});
  useEffect(() => {
    const all = value.via.flatMap((r) => r.geo_ids);
    const missing = all.filter((id) => !viaLabelMap[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const fetched = await Promise.all(missing.map((id) => fetchGeoNodeById(id)));
      if (cancelled) return;
      setViaLabelMap((prev) => {
        const next = { ...prev };
        for (const opt of fetched) {
          if (opt) next[opt.id] = opt.label;
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [value.via, viaLabelMap]);

  const setOrigin = useCallback(
    (next: GeoSelection[]) => onChange({ ...value, origin: next }),
    [value, onChange],
  );
  const setDestination = useCallback(
    (next: GeoSelection[]) => onChange({ ...value, destination: next }),
    [value, onChange],
  );

  const addViaRow = () => {
    onChange({
      ...value,
      via: [
        ...value.via,
        { _key: `via-${Date.now()}`, notes: "", geo_ids: [] },
      ],
    });
  };

  const removeViaRow = (key: string) => {
    onChange({ ...value, via: value.via.filter((r) => r._key !== key) });
  };

  const updateViaRow = (key: string, patch: Partial<ViaRow>) => {
    onChange({
      ...value,
      via: value.via.map((r) => (r._key === key ? { ...r, ...patch } : r)),
    });
  };

  void initialStops;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Stops</h4>

      {/* Origin + Destination */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <GeoSelectionField
          label="Origin"
          selections={value.origin}
          metaMap={metaMap}
          onChange={setOrigin}
          countryId={countryId}
          placeholder="Click to pick origin…"
        />
        <GeoSelectionField
          label="Destination"
          selections={value.destination}
          metaMap={metaMap}
          onChange={setDestination}
          countryId={countryId}
          placeholder="Click to pick destination…"
        />
      </div>

      {/* Via stops — legacy MultiSelectSearch (separate workstream to migrate) */}
      <div className="space-y-2">
        {value.via.map((row) => (
          <div
            key={row._key}
            className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end"
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Stop Details
              </label>
              <Input
                value={row.notes}
                onChange={(e) => updateViaRow(row._key, { notes: e.target.value })}
                placeholder="e.g. Lunch break at Marina"
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Via
              </label>
              <MultiSelectSearch
                fetchFn={fetchGeoNodes}
                value={row.geo_ids}
                onChange={(ids) => updateViaRow(row._key, { geo_ids: ids })}
                placeholder="Search via..."
                initialLabelMap={viaLabelMap}
                minChars={1}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              onClick={() => removeViaRow(row._key)}
              title="Remove stop"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addViaRow}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Stop
        </Button>
      </div>
    </div>
  );
}

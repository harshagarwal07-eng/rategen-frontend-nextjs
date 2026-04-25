"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { MultiSelectSearch, MultiSelectOption } from "@/components/ui/multi-select-search";
import { PackageStop } from "@/types/transfers";

export type ViaRow = {
  _key: string;
  notes: string;
  geo_ids: string[];
};

export type StopsState = {
  origin: string[];
  destination: string[];
  via: ViaRow[];
};

export type StopsLabelMap = Record<string, string>;

interface StopsSectionProps {
  initialStops?: PackageStop[];
  value: StopsState;
  onChange: (next: StopsState) => void;
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
// flat id arrays; via stops are reconstructed as one UI row per logical
// "Add Stop" group, keyed by the `notes` text. Stops that share the same
// notes (or both empty) collapse into one row — that's the round-trip
// contract.
export function deriveStopsState(stops?: PackageStop[]): StopsState {
  const out: StopsState = { origin: [], destination: [], via: [] };
  if (!stops) return out;

  const viaGroups = new Map<string, ViaRow>();

  for (const s of stops) {
    const ids: string[] = [];
    for (const loc of s.transfer_package_stop_locations ?? []) {
      if (loc.geo_id) ids.push(loc.geo_id);
    }
    for (const loc of s.locations ?? []) {
      if (loc.kind === "geo") ids.push(loc.id);
    }

    if (s.stop_type === "origin") {
      out.origin.push(...ids);
    } else if (s.stop_type === "destination") {
      out.destination.push(...ids);
    } else if (s.stop_type === "via") {
      const key = (s.notes ?? "").trim();
      const existing = viaGroups.get(key);
      if (existing) {
        existing.geo_ids.push(...ids);
      } else {
        viaGroups.set(key, {
          _key: `via-${viaGroups.size}-${Date.now()}`,
          notes: s.notes ?? "",
          geo_ids: ids,
        });
      }
    }
  }

  out.via = Array.from(viaGroups.values());
  return out;
}

// UI state → backend payload. One stop row per (type, location) pair so each
// stop is independently reorderable. Origins first, then via rows in the order
// the user added them, then destinations.
export function buildStopsPayload(state: StopsState) {
  const rows: Array<{
    stop_order: number;
    stop_type: "origin" | "via" | "destination";
    notes?: string | null;
    locations: Array<{ kind: "geo"; id: string }>;
  }> = [];
  let stop_order = 1;

  for (const id of state.origin) {
    rows.push({
      stop_order: stop_order++,
      stop_type: "origin",
      locations: [{ kind: "geo", id }],
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
  for (const id of state.destination) {
    rows.push({
      stop_order: stop_order++,
      stop_type: "destination",
      locations: [{ kind: "geo", id }],
    });
  }
  return rows;
}

export default function StopsSection({
  initialStops,
  value,
  onChange,
}: StopsSectionProps) {
  const [labelMap, setLabelMap] = useState<StopsLabelMap>({});

  // Hydrate labels for any pre-selected ids missing from labelMap.
  useEffect(() => {
    const all = [
      ...value.origin,
      ...value.destination,
      ...value.via.flatMap((r) => r.geo_ids),
    ];
    const missing = all.filter((id) => !labelMap[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const fetched = await Promise.all(missing.map((id) => fetchGeoNodeById(id)));
      if (cancelled) return;
      setLabelMap((prev) => {
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
  }, [value, labelMap]);

  const setOrigin = useCallback(
    (ids: string[]) => onChange({ ...value, origin: ids }),
    [value, onChange]
  );
  const setDestination = useCallback(
    (ids: string[]) => onChange({ ...value, destination: ids }),
    [value, onChange]
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
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Origin
          </label>
          <MultiSelectSearch
            fetchFn={fetchGeoNodes}
            value={value.origin}
            onChange={setOrigin}
            placeholder="Search origin..."
            initialLabelMap={labelMap}
            minChars={1}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Destination
          </label>
          <MultiSelectSearch
            fetchFn={fetchGeoNodes}
            value={value.destination}
            onChange={setDestination}
            placeholder="Search destination..."
            initialLabelMap={labelMap}
            minChars={1}
          />
        </div>
      </div>

      {/* Via stops */}
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
                initialLabelMap={labelMap}
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

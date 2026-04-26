"use client";

import { useEffect, useMemo, useState } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, ChevronDown, ChevronRight, Loader2, Minus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  fetchCountryTree,
  type CountryTreeResponse,
  type TreeAreaNode,
  type TreeCityNode,
  type TreeZoneNode,
} from "@/data-access/geo-picker-api";
import type {
  GeoPickerKindContentProps,
  GeoSelection,
} from "../types";

// Cache trees across modal opens (per countryId). Module-scoped so multiple
// modal mounts share the same fetch.
const treeCache = new Map<string, CountryTreeResponse>();

// ── Cascade helpers ──────────────────────────────────────────────

function cityDescendantIds(c: TreeCityNode): string[] {
  const out: string[] = [];
  for (const a of c.areas) out.push(a.id);
  for (const z of c.zones) {
    out.push(z.id);
    for (const a of z.areas) out.push(a.id);
  }
  return out;
}

function zoneDescendantIds(z: TreeZoneNode): string[] {
  return z.areas.map((a) => a.id);
}

// State of a parent node given the current selection set:
//   'checked'       — self and all descendants selected (or no descendants)
//   'indeterminate' — at least one descendant or self selected, but not all
//   'unchecked'     — nothing in this subtree selected
function parentState(
  selfId: string,
  descendantIds: string[],
  selected: Set<string>,
): "checked" | "indeterminate" | "unchecked" {
  const all = [selfId, ...descendantIds];
  let on = 0;
  for (const id of all) if (selected.has(id)) on++;
  if (on === 0) return "unchecked";
  if (on === all.length) return "checked";
  return "indeterminate";
}

// Walk the tree once and map each node id to its breadcrumb (relative
// to the country, no country prefix).
function buildBreadcrumbMap(
  tree: CountryTreeResponse,
): Record<string, string> {
  const m: Record<string, string> = {};
  for (const c of tree.cities) {
    m[c.id] = c.name;
    for (const a of c.areas) m[a.id] = `${c.name} › ${a.name}`;
    for (const z of c.zones) {
      m[z.id] = `${c.name} › ${z.name}`;
      for (const a of z.areas) m[a.id] = `${c.name} › ${z.name} › ${a.name}`;
    }
  }
  return m;
}

// Walk the tree once and map each node id to its type. Used when cascading
// so descendant entries get the right `nodeType`.
function buildTypeMap(
  tree: CountryTreeResponse,
): Record<string, "city" | "zone" | "area"> {
  const m: Record<string, "city" | "zone" | "area"> = {};
  for (const c of tree.cities) {
    m[c.id] = "city";
    for (const a of c.areas) m[a.id] = "area";
    for (const z of c.zones) {
      m[z.id] = "zone";
      for (const a of z.areas) m[a.id] = "area";
    }
  }
  return m;
}

function nodeMatchesQuery(needle: string, name: string): boolean {
  if (!needle) return true;
  return name.toLowerCase().includes(needle.toLowerCase());
}

// A city is shown if: itself matches, or any of its zones/areas match.
// Same for zone. Areas match by their own name.
function buildVisibility(
  tree: CountryTreeResponse,
  needle: string,
): {
  visibleCity: Set<string>;
  visibleZone: Set<string>;
  visibleArea: Set<string>;
  // City/zone IDs that should auto-expand because a descendant matched.
  autoExpand: Set<string>;
} {
  const vc = new Set<string>();
  const vz = new Set<string>();
  const va = new Set<string>();
  const ax = new Set<string>();
  const q = needle.trim();

  for (const c of tree.cities) {
    let cityHasHit = false;
    if (nodeMatchesQuery(q, c.name)) {
      vc.add(c.id);
      cityHasHit = true;
    }
    for (const a of c.areas) {
      if (nodeMatchesQuery(q, a.name)) {
        va.add(a.id);
        vc.add(c.id);
        if (q) ax.add(c.id);
        cityHasHit = true;
      }
    }
    for (const z of c.zones) {
      let zoneHasHit = false;
      if (nodeMatchesQuery(q, z.name)) {
        vz.add(z.id);
        vc.add(c.id);
        if (q) ax.add(c.id);
        zoneHasHit = true;
        cityHasHit = true;
      }
      for (const a of z.areas) {
        if (nodeMatchesQuery(q, a.name)) {
          va.add(a.id);
          vz.add(z.id);
          vc.add(c.id);
          if (q) {
            ax.add(c.id);
            ax.add(z.id);
          }
          zoneHasHit = true;
          cityHasHit = true;
        }
      }
      if (vz.has(z.id) && !zoneHasHit) {
        for (const a of z.areas) va.add(a.id);
      }
    }
    if (cityHasHit && !q) {
      for (const a of c.areas) va.add(a.id);
      for (const z of c.zones) {
        vz.add(z.id);
        for (const a of z.areas) va.add(a.id);
      }
    } else if (vc.has(c.id) && q && nodeMatchesQuery(q, c.name)) {
      for (const a of c.areas) va.add(a.id);
      for (const z of c.zones) {
        vz.add(z.id);
        for (const a of z.areas) va.add(a.id);
      }
    }
  }

  return { visibleCity: vc, visibleZone: vz, visibleArea: va, autoExpand: ax };
}

export default function CityKindContent({
  activeCountryId,
  selections,
  onChange,
  search,
}: GeoPickerKindContentProps) {
  const [tree, setTree] = useState<CountryTreeResponse | null>(
    treeCache.get(activeCountryId) ?? null,
  );
  const [loading, setLoading] = useState<boolean>(
    !treeCache.has(activeCountryId),
  );
  const [error, setError] = useState<string | null>(null);
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  // Re-fetch (or pull from cache) when the active country changes.
  useEffect(() => {
    if (!activeCountryId) return;
    if (treeCache.has(activeCountryId)) {
      setTree(treeCache.get(activeCountryId) ?? null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTree(null);
    fetchCountryTree(activeCountryId).then((r) => {
      if (cancelled) return;
      if (r.error || !r.data) {
        setError(r.error ?? "Failed to load tree");
        setLoading(false);
        return;
      }
      treeCache.set(activeCountryId, r.data);
      setTree(r.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeCountryId]);

  // Reset expand state on country switch so the new tree starts collapsed.
  useEffect(() => {
    setExpandedCities(new Set());
    setExpandedZones(new Set());
  }, [activeCountryId]);

  const visibility = useMemo(() => {
    if (!tree)
      return {
        visibleCity: new Set<string>(),
        visibleZone: new Set<string>(),
        visibleArea: new Set<string>(),
        autoExpand: new Set<string>(),
      };
    return buildVisibility(tree, search);
  }, [tree, search]);

  const breadcrumbMap = useMemo(
    () => (tree ? buildBreadcrumbMap(tree) : {}),
    [tree],
  );
  const typeMap = useMemo(() => (tree ? buildTypeMap(tree) : {}), [tree]);

  const effectiveExpandedCities = useMemo(() => {
    if (!search.trim()) return expandedCities;
    return new Set([...expandedCities, ...visibility.autoExpand]);
  }, [expandedCities, search, visibility.autoExpand]);

  const effectiveExpandedZones = useMemo(() => {
    if (!search.trim()) return expandedZones;
    return new Set([...expandedZones, ...visibility.autoExpand]);
  }, [expandedZones, search, visibility.autoExpand]);

  // Selection set for this country only — cross-country selections live in
  // the parent state and stay untouched by this kind's logic.
  const selectedIdsThisCountry = useMemo(() => {
    const s = new Set<string>();
    for (const sel of selections) {
      if (sel.kind !== "geo") continue;
      // Only include selections from the active country in cascade math.
      // Selections lacking country_id (legacy) are still rendered if their
      // id happens to be in this tree.
      if (sel.country_id && sel.country_id !== activeCountryId) continue;
      s.add(sel.id);
    }
    return s;
  }, [selections, activeCountryId]);

  function applyToggle(idsToAdd: string[], idsToRemove: string[]) {
    if (!tree) return;
    const removeSet = new Set(idsToRemove);
    const addSet = new Set(idsToAdd);
    // Drop any existing geo selections from this country that intersect the
    // remove set, then append fresh entries for the add set.
    const filtered = selections.filter((s) => {
      if (s.kind !== "geo") return true;
      if (s.country_id && s.country_id !== activeCountryId) return true;
      // Same-country geo selection — keep unless we're removing it.
      return !removeSet.has(s.id);
    });
    const additions: GeoSelection[] = [];
    for (const id of addSet) {
      // Don't double-add if already present (this can happen when a child
      // was already selected and the parent gets cascaded).
      if (filtered.some((s) => s.kind === "geo" && s.id === id)) continue;
      const nodeType = typeMap[id];
      if (!nodeType) continue;
      additions.push({
        kind: "geo",
        id,
        label: breadcrumbMap[id],
        nodeType,
        country_id: tree.country_id,
        country_name: tree.country_name,
      });
    }
    onChange([...filtered, ...additions]);
  }

  function toggleCity(c: TreeCityNode) {
    const desc = cityDescendantIds(c);
    const state = parentState(c.id, desc, selectedIdsThisCountry);
    if (state === "checked") {
      applyToggle([], [c.id, ...desc]);
    } else {
      applyToggle([c.id, ...desc], []);
    }
  }

  function toggleZone(z: TreeZoneNode) {
    const desc = zoneDescendantIds(z);
    const state = parentState(z.id, desc, selectedIdsThisCountry);
    if (state === "checked") {
      applyToggle([], [z.id, ...desc]);
    } else {
      applyToggle([z.id, ...desc], []);
    }
  }

  function toggleArea(a: TreeAreaNode) {
    if (selectedIdsThisCountry.has(a.id)) {
      applyToggle([], [a.id]);
    } else {
      applyToggle([a.id], []);
    }
  }

  function toggleCityExpanded(id: string) {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleZoneExpanded(id: string) {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <span className="text-sm">Loading tree…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-8 text-center text-sm text-destructive">{error}</div>
    );
  }
  if (!tree || tree.cities.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No locations found for this country.
      </div>
    );
  }

  const { visibleCity, visibleZone, visibleArea } = visibility;

  return (
    <ScrollArea className="h-[400px] rounded-md border">
      <div className="p-2 space-y-0.5">
        {tree.cities.map((c) => {
          if (!visibleCity.has(c.id)) return null;
          const desc = cityDescendantIds(c);
          const cityState = parentState(c.id, desc, selectedIdsThisCountry);
          const hasChildren = c.zones.length > 0 || c.areas.length > 0;
          const expanded = effectiveExpandedCities.has(c.id);
          return (
            <div key={c.id}>
              <Row
                level={0}
                hasChildren={hasChildren}
                expanded={expanded}
                onExpandToggle={() => toggleCityExpanded(c.id)}
                state={cityState}
                onCheckedChange={() => toggleCity(c)}
                label={c.name}
                badge="city"
              />
              {expanded && hasChildren && (
                <div>
                  {c.areas
                    .filter((a) => visibleArea.has(a.id))
                    .map((a) => (
                      <Row
                        key={a.id}
                        level={1}
                        hasChildren={false}
                        state={
                          selectedIdsThisCountry.has(a.id)
                            ? "checked"
                            : "unchecked"
                        }
                        onCheckedChange={() => toggleArea(a)}
                        label={a.name}
                        badge="area"
                      />
                    ))}
                  {c.zones
                    .filter((z) => visibleZone.has(z.id))
                    .map((z) => {
                      const zDesc = zoneDescendantIds(z);
                      const zState = parentState(
                        z.id,
                        zDesc,
                        selectedIdsThisCountry,
                      );
                      const zExpanded = effectiveExpandedZones.has(z.id);
                      const zHasAreas = z.areas.length > 0;
                      return (
                        <div key={z.id}>
                          <Row
                            level={1}
                            hasChildren={zHasAreas}
                            expanded={zExpanded}
                            onExpandToggle={() => toggleZoneExpanded(z.id)}
                            state={zState}
                            onCheckedChange={() => toggleZone(z)}
                            label={z.name}
                            badge="zone"
                          />
                          {zExpanded &&
                            z.areas
                              .filter((a) => visibleArea.has(a.id))
                              .map((a) => (
                                <Row
                                  key={a.id}
                                  level={2}
                                  hasChildren={false}
                                  state={
                                    selectedIdsThisCountry.has(a.id)
                                      ? "checked"
                                      : "unchecked"
                                  }
                                  onCheckedChange={() => toggleArea(a)}
                                  label={a.name}
                                  badge="area"
                                />
                              ))}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

interface RowProps {
  level: number;
  hasChildren: boolean;
  expanded?: boolean;
  onExpandToggle?: () => void;
  state: "checked" | "indeterminate" | "unchecked";
  onCheckedChange: () => void;
  label: string;
  badge: "city" | "zone" | "area";
}

function Row({
  level,
  hasChildren,
  expanded,
  onExpandToggle,
  state,
  onCheckedChange,
  label,
  badge,
}: RowProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-md py-1.5 pr-2 hover:bg-accent/50"
      style={{ paddingLeft: 8 + level * 20 }}
    >
      <button
        type="button"
        onClick={hasChildren ? onExpandToggle : undefined}
        disabled={!hasChildren}
        className={cn(
          "h-5 w-5 flex items-center justify-center rounded-sm",
          hasChildren
            ? "text-muted-foreground hover:bg-accent"
            : "opacity-0 pointer-events-none",
        )}
        aria-label={expanded ? "Collapse" : "Expand"}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>
      <TriCheckbox state={state} onChange={onCheckedChange} />
      <button
        type="button"
        onClick={onCheckedChange}
        className="flex-1 text-left text-sm py-0.5"
      >
        {label}
      </button>
      <span
        className={cn(
          "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm",
          badge === "city" && "bg-blue-50 text-blue-700",
          badge === "zone" && "bg-amber-50 text-amber-700",
          badge === "area" && "bg-emerald-50 text-emerald-700",
        )}
      >
        {badge}
      </span>
    </div>
  );
}

// Local checkbox that supports the indeterminate state. The shared UI
// Checkbox forces a CheckIcon in its Indicator so we use the Radix
// primitive directly to swap in a Minus icon when partial.
function TriCheckbox({
  state,
  onChange,
}: {
  state: "checked" | "indeterminate" | "unchecked";
  onChange: () => void;
}) {
  const checked: boolean | "indeterminate" =
    state === "checked"
      ? true
      : state === "indeterminate"
        ? "indeterminate"
        : false;
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={() => onChange()}
      className={cn(
        "peer border-2 size-4 shrink-0 rounded-[4px] shadow-xs outline-none transition-shadow",
        "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary",
        "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary",
      )}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {state === "indeterminate" ? (
          <Minus className="size-3.5" />
        ) : (
          <Check className="size-3.5" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

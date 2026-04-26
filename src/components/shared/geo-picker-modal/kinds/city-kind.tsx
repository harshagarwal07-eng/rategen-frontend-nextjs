"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  fetchCountryTree,
  type CountryTreeResponse,
  type TreeAreaNode,
  type TreeCityNode,
  type TreeZoneNode,
} from "@/data-access/geo-picker-api";
import type { GeoPickerKindContentProps, GeoSelection } from "../types";

// Cache trees across modal opens (per countryId). Mounted-once per session.
const treeCache = new Map<string, CountryTreeResponse>();

type Node =
  | { kind: "city"; node: TreeCityNode }
  | { kind: "zone"; node: TreeZoneNode; cityId: string }
  | { kind: "area"; node: TreeAreaNode; cityId: string; zoneId: string | null };

function nodeBreadcrumb(
  tree: CountryTreeResponse,
  id: string,
): string | undefined {
  for (const c of tree.cities) {
    if (c.id === id) return c.name;
    for (const a of c.areas) {
      if (a.id === id) return `${c.name} › ${a.name}`;
    }
    for (const z of c.zones) {
      if (z.id === id) return `${c.name} › ${z.name}`;
      for (const a of z.areas) {
        if (a.id === id) return `${c.name} › ${z.name} › ${a.name}`;
      }
    }
  }
  return undefined;
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
      // If the zone itself matches but no area was hit, still surface its
      // areas underneath (don't filter them out).
      if (vz.has(z.id) && !zoneHasHit) {
        for (const a of z.areas) va.add(a.id);
      }
    }
    // If the city itself matches but no descendant hit, keep all
    // descendants visible.
    if (cityHasHit && !q) {
      for (const a of c.areas) va.add(a.id);
      for (const z of c.zones) {
        vz.add(z.id);
        for (const a of z.areas) va.add(a.id);
      }
    } else if (vc.has(c.id) && q && nodeMatchesQuery(q, c.name)) {
      // City name matched the query — show its full subtree too.
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
  countryId,
  selections,
  onChange,
  search,
}: GeoPickerKindContentProps) {
  const [tree, setTree] = useState<CountryTreeResponse | null>(
    treeCache.get(countryId) ?? null,
  );
  const [loading, setLoading] = useState<boolean>(!treeCache.has(countryId));
  const [error, setError] = useState<string | null>(null);
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!countryId) return;
    if (treeCache.has(countryId)) {
      setTree(treeCache.get(countryId) ?? null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCountryTree(countryId).then((r) => {
      if (cancelled) return;
      if (r.error || !r.data) {
        setError(r.error ?? "Failed to load tree");
        setLoading(false);
        return;
      }
      treeCache.set(countryId, r.data);
      setTree(r.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [countryId]);

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

  // Auto-expand parents of search hits.
  const effectiveExpandedCities = useMemo(() => {
    if (!search.trim()) return expandedCities;
    return new Set([...expandedCities, ...visibility.autoExpand]);
  }, [expandedCities, search, visibility.autoExpand]);

  const effectiveExpandedZones = useMemo(() => {
    if (!search.trim()) return expandedZones;
    return new Set([...expandedZones, ...visibility.autoExpand]);
  }, [expandedZones, search, visibility.autoExpand]);

  // Selection helpers — only touch geo-kind entries.
  const selectedGeoIds = useMemo(() => {
    const s = new Set<string>();
    for (const sel of selections) if (sel.kind === "geo") s.add(sel.id);
    return s;
  }, [selections]);

  function toggleNode(node: Node) {
    if (!tree) return;
    const id =
      node.kind === "city"
        ? node.node.id
        : node.kind === "zone"
          ? node.node.id
          : node.node.id;
    const name = node.node.name;
    const nodeType = node.kind;
    const breadcrumb = nodeBreadcrumb(tree, id);
    const label = breadcrumb ?? name;
    const others = selections.filter(
      (s) => !(s.kind === "geo" && s.id === id),
    );
    if (selectedGeoIds.has(id)) {
      onChange(others);
    } else {
      const next: GeoSelection = {
        kind: "geo",
        id,
        label,
        nodeType,
      };
      onChange([...others, next]);
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
          const hasChildren = c.zones.length > 0 || c.areas.length > 0;
          const expanded = effectiveExpandedCities.has(c.id);
          const cityChecked = selectedGeoIds.has(c.id);
          return (
            <div key={c.id}>
              <Row
                level={0}
                hasChildren={hasChildren}
                expanded={expanded}
                onExpandToggle={() => toggleCityExpanded(c.id)}
                checked={cityChecked}
                onCheckedChange={() =>
                  toggleNode({ kind: "city", node: c })
                }
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
                        checked={selectedGeoIds.has(a.id)}
                        onCheckedChange={() =>
                          toggleNode({
                            kind: "area",
                            node: a,
                            cityId: c.id,
                            zoneId: null,
                          })
                        }
                        label={a.name}
                        badge="area"
                      />
                    ))}
                  {c.zones
                    .filter((z) => visibleZone.has(z.id))
                    .map((z) => {
                      const zExpanded = effectiveExpandedZones.has(z.id);
                      const zHasAreas = z.areas.length > 0;
                      return (
                        <div key={z.id}>
                          <Row
                            level={1}
                            hasChildren={zHasAreas}
                            expanded={zExpanded}
                            onExpandToggle={() => toggleZoneExpanded(z.id)}
                            checked={selectedGeoIds.has(z.id)}
                            onCheckedChange={() =>
                              toggleNode({
                                kind: "zone",
                                node: z,
                                cityId: c.id,
                              })
                            }
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
                                  checked={selectedGeoIds.has(a.id)}
                                  onCheckedChange={() =>
                                    toggleNode({
                                      kind: "area",
                                      node: a,
                                      cityId: c.id,
                                      zoneId: z.id,
                                    })
                                  }
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
  checked: boolean;
  onCheckedChange: () => void;
  label: string;
  badge: "city" | "zone" | "area";
}

function Row({
  level,
  hasChildren,
  expanded,
  onExpandToggle,
  checked,
  onCheckedChange,
  label,
  badge,
}: RowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md py-1.5 pr-2 hover:bg-accent/50",
      )}
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
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="h-4 w-4"
      />
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  createCustomLocation,
  fetchCountryTree,
  listCustomLocations,
  type CountryTreeResponse,
  type DmcCustomLocation,
} from "@/data-access/geo-picker-api";
import { toast } from "sonner";
import type {
  GeoPickerKindContentProps,
  GeoSelection,
} from "../types";

// Reuse the tree cache from city-kind via re-fetching once per modal open.
// Anchor selection is single-select.
const customListCache = { value: null as DmcCustomLocation[] | null };
const treeCache = new Map<string, CountryTreeResponse>();

type AnchorPick = { id: string; label: string; type: "city" | "zone" | "area" };

function locationLabel(
  loc: DmcCustomLocation,
  anchorLabelById: Record<string, string>,
): string {
  const anchor = loc.parent_geo_id ? anchorLabelById[loc.parent_geo_id] : null;
  return anchor ? `${loc.name} • ${anchor}` : loc.name;
}

// Walk the tree once and return an id→breadcrumb map. Used to label
// anchored custom locations in the list.
function buildAnchorLabelMap(tree: CountryTreeResponse | null): Record<string, string> {
  const m: Record<string, string> = {};
  if (!tree) return m;
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

export default function CustomPointKindContent({
  countryId,
  selections,
  onChange,
  search,
}: GeoPickerKindContentProps) {
  const [view, setView] = useState<"pick" | "create">("pick");
  const [items, setItems] = useState<DmcCustomLocation[] | null>(
    customListCache.value,
  );
  const [loadingItems, setLoadingItems] = useState<boolean>(
    customListCache.value === null,
  );
  const [tree, setTree] = useState<CountryTreeResponse | null>(
    treeCache.get(countryId) ?? null,
  );

  // Create form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"city" | "zone" | "area" | "venue">("venue");
  const [anchor, setAnchor] = useState<AnchorPick | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customListCache.value !== null) {
      setItems(customListCache.value);
      setLoadingItems(false);
      return;
    }
    let cancelled = false;
    setLoadingItems(true);
    listCustomLocations().then((r) => {
      if (cancelled) return;
      const data = r.data ?? [];
      customListCache.value = data;
      setItems(data);
      setLoadingItems(false);
      if (r.error) toast.error(r.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!countryId) return;
    if (treeCache.has(countryId)) {
      setTree(treeCache.get(countryId) ?? null);
      return;
    }
    let cancelled = false;
    fetchCountryTree(countryId).then((r) => {
      if (cancelled || !r.data) return;
      treeCache.set(countryId, r.data);
      setTree(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  const anchorLabelById = useMemo(() => buildAnchorLabelMap(tree), [tree]);

  const selectedCustomIds = useMemo(() => {
    const s = new Set<string>();
    for (const sel of selections) if (sel.kind === "dmc_custom") s.add(sel.id);
    return s;
  }, [selections]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const label = locationLabel(it, anchorLabelById).toLowerCase();
      return label.includes(q);
    });
  }, [items, search, anchorLabelById]);

  function toggleCustom(loc: DmcCustomLocation) {
    const exists = selectedCustomIds.has(loc.id);
    const others = selections.filter(
      (s) => !(s.kind === "dmc_custom" && s.id === loc.id),
    );
    if (exists) {
      onChange(others);
      return;
    }
    const next: GeoSelection = {
      kind: "dmc_custom",
      id: loc.id,
      label: locationLabel(loc, anchorLabelById),
    };
    onChange([...others, next]);
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!anchor) {
      toast.error("Pick an anchor (city / zone / area)");
      return;
    }
    setSubmitting(true);
    const r = await createCustomLocation({
      name: name.trim(),
      type,
      parent_geo_id: anchor.id,
    });
    setSubmitting(false);
    if (r.error || !r.data) {
      toast.error(r.error ?? "Failed to create");
      return;
    }
    const created = r.data;
    const nextItems = [...(items ?? []), created];
    customListCache.value = nextItems;
    setItems(nextItems);
    // Auto-select the new entry.
    const sel: GeoSelection = {
      kind: "dmc_custom",
      id: created.id,
      label: locationLabel(created, anchorLabelById),
    };
    onChange([...selections, sel]);
    // Reset & flip back to list.
    setName("");
    setAnchor(null);
    setType("venue");
    setView("pick");
    toast.success("Custom location created");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={view === "pick" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("pick")}
        >
          Pick existing
        </Button>
        <Button
          type="button"
          variant={view === "create" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("create")}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Create new
        </Button>
      </div>

      {view === "pick" ? (
        <ScrollArea className="h-[400px] rounded-md border">
          <div className="p-2 space-y-0.5">
            {loadingItems ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {items && items.length === 0
                  ? "No custom locations yet. Click \"Create new\" to add one."
                  : "No matches."}
              </div>
            ) : (
              filteredItems.map((loc) => {
                const checked = selectedCustomIds.has(loc.id);
                const anchorLabel = loc.parent_geo_id
                  ? anchorLabelById[loc.parent_geo_id] ?? null
                  : null;
                return (
                  <div
                    key={loc.id}
                    className="flex items-center gap-2 rounded-md py-1.5 px-2 hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleCustom(loc)}
                      className="h-4 w-4"
                    />
                    <button
                      type="button"
                      onClick={() => toggleCustom(loc)}
                      className="flex-1 text-left text-sm py-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{loc.name}</span>
                        {loc.type ? (
                          <span className="text-[10px] uppercase tracking-wide bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-sm">
                            {loc.type}
                          </span>
                        ) : null}
                      </div>
                      {anchorLabel ? (
                        <div className="text-xs text-muted-foreground pl-5">
                          {anchorLabel}
                        </div>
                      ) : null}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      ) : (
        <CreateForm
          tree={tree}
          name={name}
          setName={setName}
          type={type}
          setType={setType}
          anchor={anchor}
          setAnchor={setAnchor}
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => setView("pick")}
        />
      )}
    </div>
  );
}

interface CreateFormProps {
  tree: CountryTreeResponse | null;
  name: string;
  setName: (s: string) => void;
  type: "city" | "zone" | "area" | "venue";
  setType: (t: "city" | "zone" | "area" | "venue") => void;
  anchor: AnchorPick | null;
  setAnchor: (a: AnchorPick | null) => void;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

function CreateForm({
  tree,
  name,
  setName,
  type,
  setType,
  anchor,
  setAnchor,
  submitting,
  onSubmit,
  onCancel,
}: CreateFormProps) {
  const [anchorSearch, setAnchorSearch] = useState("");
  const flat = useMemo(() => {
    if (!tree) return [] as Array<AnchorPick>;
    const out: Array<AnchorPick> = [];
    for (const c of tree.cities) {
      out.push({ id: c.id, label: c.name, type: "city" });
      for (const a of c.areas)
        out.push({ id: a.id, label: `${c.name} › ${a.name}`, type: "area" });
      for (const z of c.zones) {
        out.push({ id: z.id, label: `${c.name} › ${z.name}`, type: "zone" });
        for (const a of z.areas)
          out.push({
            id: a.id,
            label: `${c.name} › ${z.name} › ${a.name}`,
            type: "area",
          });
      }
    }
    return out;
  }, [tree]);

  const filtered = useMemo(() => {
    const q = anchorSearch.trim().toLowerCase();
    if (!q) return flat.slice(0, 100);
    return flat.filter((n) => n.label.toLowerCase().includes(q)).slice(0, 100);
  }, [flat, anchorSearch]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Burj Khalifa Pickup Lobby"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <div className="flex flex-wrap gap-1.5">
            {(["venue", "area", "zone", "city"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "px-2 py-1 text-xs rounded border",
                  type === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Anchor (city / zone / area)</Label>
        {anchor ? (
          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span className="truncate">
              <span className="text-muted-foreground capitalize">
                {anchor.type}:
              </span>{" "}
              {anchor.label}
            </span>
            <button
              type="button"
              onClick={() => setAnchor(null)}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <Input
              value={anchorSearch}
              onChange={(e) => setAnchorSearch(e.target.value)}
              placeholder="Search city / zone / area..."
            />
            <ScrollArea className="h-[220px] rounded-md border">
              <div className="p-1">
                {filtered.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    {tree ? "No matches." : "Loading tree…"}
                  </div>
                ) : (
                  filtered.map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => setAnchor(n)}
                      className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{n.label}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {n.type}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSubmit}
          disabled={submitting || !name.trim() || !anchor}
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : null}
          Create & select
        </Button>
      </div>
    </div>
  );
}

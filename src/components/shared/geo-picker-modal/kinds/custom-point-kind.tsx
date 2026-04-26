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
  fetchEntity,
  listCustomLocations,
  type CountryTreeResponse,
  type DmcCustomLocation,
} from "@/data-access/geo-picker-api";
import { toast } from "sonner";
import type {
  GeoPickerKindContentProps,
  GeoSelection,
} from "../types";

// Module-scoped caches survive remounts within the same session.
const customListCache = { value: null as DmcCustomLocation[] | null };
const treeCache = new Map<string, CountryTreeResponse>();
// `parent_geo_id` → `{ country_id, country_name }`. Resolved on demand via
// /api/geo/entity/:id. Custom locations may anchor outside the active
// country, so the breadcrumb has to come from the entity endpoint, not
// the currently-loaded tree.
const anchorCountryCache = new Map<
  string,
  { country_id: string; country_name: string } | null
>();

type AnchorPick = {
  id: string;
  label: string;
  type: "city" | "zone" | "area";
};

function locationLabel(loc: DmcCustomLocation): string {
  return loc.name;
}

export default function CustomPointKindContent({
  activeCountryId,
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
  // Anchor country resolutions — tracked in state so re-renders pick up
  // newly-resolved entries from the cache.
  const [anchorCountries, setAnchorCountries] = useState<
    Record<string, { country_id: string; country_name: string } | null>
  >(() => Object.fromEntries(anchorCountryCache.entries()));

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

  // Resolve anchor → country for any custom location whose anchor we
  // haven't seen yet. Run in parallel; one entity call per unique anchor.
  useEffect(() => {
    if (!items || items.length === 0) return;
    const unresolved = Array.from(
      new Set(
        items
          .map((i) => i.parent_geo_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
          .filter((id) => !anchorCountryCache.has(id)),
      ),
    );
    if (unresolved.length === 0) return;
    let cancelled = false;
    Promise.all(
      unresolved.map(async (id) => {
        const r = await fetchEntity(id);
        const c = r.data?.ancestors.country ?? null;
        const resolved = c
          ? { country_id: c.id, country_name: c.name }
          : null;
        anchorCountryCache.set(id, resolved);
        return [id, resolved] as const;
      }),
    ).then((rows) => {
      if (cancelled) return;
      setAnchorCountries((prev) => {
        const next = { ...prev };
        for (const [id, val] of rows) next[id] = val;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

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
      const country = it.parent_geo_id
        ? anchorCountries[it.parent_geo_id]?.country_name ?? ""
        : "";
      const haystack = `${it.name} ${country}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search, anchorCountries]);

  function toggleCustom(loc: DmcCustomLocation) {
    const exists = selectedCustomIds.has(loc.id);
    const others = selections.filter(
      (s) => !(s.kind === "dmc_custom" && s.id === loc.id),
    );
    if (exists) {
      onChange(others);
      return;
    }
    const country = loc.parent_geo_id
      ? anchorCountries[loc.parent_geo_id] ?? null
      : null;
    const next: GeoSelection = {
      kind: "dmc_custom",
      id: loc.id,
      label: locationLabel(loc),
      country_id: country?.country_id,
      country_name: country?.country_name,
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
    // Reuse the resolved country from the anchor we just picked.
    if (created.parent_geo_id) {
      const cached = anchorCountryCache.get(created.parent_geo_id);
      // Auto-select the new entry. The country is whichever country the
      // anchor came from — known via cache or via a fresh resolution
      // (kicked off by the items effect).
      const sel: GeoSelection = {
        kind: "dmc_custom",
        id: created.id,
        label: created.name,
        country_id: cached?.country_id,
        country_name: cached?.country_name,
      };
      onChange([...selections, sel]);
    }
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
                const country = loc.parent_geo_id
                  ? anchorCountries[loc.parent_geo_id] ?? null
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
                      {country ? (
                        <div className="text-xs text-muted-foreground pl-5">
                          {country.country_name}
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
          activeCountryId={activeCountryId}
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
  activeCountryId: string;
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
  activeCountryId,
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
  const [tree, setTree] = useState<CountryTreeResponse | null>(
    treeCache.get(activeCountryId) ?? null,
  );
  const [anchorSearch, setAnchorSearch] = useState("");

  useEffect(() => {
    if (!activeCountryId) return;
    if (treeCache.has(activeCountryId)) {
      setTree(treeCache.get(activeCountryId) ?? null);
      return;
    }
    let cancelled = false;
    setTree(null);
    fetchCountryTree(activeCountryId).then((r) => {
      if (cancelled || !r.data) return;
      treeCache.set(activeCountryId, r.data);
      setTree(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, [activeCountryId]);

  // Switching country in the modal clears any anchor that came from a
  // previous country to avoid mismatched-country submissions.
  useEffect(() => {
    setAnchor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCountryId]);

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
        <Label className="text-xs">
          Anchor (city / zone / area in {tree?.country_name ?? "current country"})
        </Label>
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
        <p className="text-[11px] text-muted-foreground">
          Switch the country in the modal header to anchor to a different
          country.
        </p>
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

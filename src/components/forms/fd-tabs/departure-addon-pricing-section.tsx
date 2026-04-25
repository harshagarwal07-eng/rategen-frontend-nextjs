"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { FDAddon } from "@/types/fixed-departures";

export interface AddonOverrideState {
  addon_id: string;
  enabled: boolean;
  rate_single: number | null;
  rate_double: number | null;
  rate_triple: number | null;
  rate_child_no_bed: number | null;
  rate_child_extra_bed: number | null;
  rate_infant: number | null;
}

const RATE_FIELDS: { key: Exclude<keyof AddonOverrideState, "addon_id" | "enabled">; label: string }[] = [
  { key: "rate_single", label: "Single" },
  { key: "rate_double", label: "Double" },
  { key: "rate_triple", label: "Triple" },
  { key: "rate_child_no_bed", label: "Child (No Bed)" },
  { key: "rate_child_extra_bed", label: "Child (Extra Bed)" },
  { key: "rate_infant", label: "Infant" },
];

const ADDON_TYPE_LABEL: Record<string, string> = {
  day_tour: "Day Tour",
  multi_day_tour: "Multi-day Tour",
  meal: "Meal",
  transfer: "Transfer",
  other: "Other",
};

interface Props {
  addons: FDAddon[];
  overrides: AddonOverrideState[];
  onChange: (next: AddonOverrideState[]) => void;
  currency: string | null;
}

export function DepartureAddonPricingSection({ addons, overrides, onChange, currency }: Props) {
  if (addons.length === 0) return null;

  const overrideById = new Map(overrides.map((o) => [o.addon_id, o]));

  const setOverride = (addonId: string, patch: Partial<AddonOverrideState>) => {
    const existing = overrideById.get(addonId);
    const base: AddonOverrideState = existing ?? {
      addon_id: addonId,
      enabled: false,
      rate_single: null,
      rate_double: null,
      rate_triple: null,
      rate_child_no_bed: null,
      rate_child_extra_bed: null,
      rate_infant: null,
    };
    const merged = { ...base, ...patch };
    const next = existing
      ? overrides.map((o) => (o.addon_id === addonId ? merged : o))
      : [...overrides, merged];
    onChange(next);
  };

  return (
    <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Addon Pricing
      </div>
      <div className="text-xs text-muted-foreground">
        Override per-occupancy rates for any add-on on this specific departure.
      </div>
      <div className="flex flex-col gap-2">
        {addons.map((addon) => {
          const o = overrideById.get(addon.id);
          const enabled = !!o?.enabled;
          return (
            <div key={addon.id} className="rounded-md border bg-background p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{addon.name}</span>
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {ADDON_TYPE_LABEL[addon.addon_type] ?? addon.addon_type}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Label className="text-xs">Override default rates</Label>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => setOverride(addon.id, { enabled: v })}
                  />
                </div>
              </div>
              {enabled ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {RATE_FIELDS.map((f) => (
                    <div key={f.key} className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {f.label}
                      </span>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-8 pr-12"
                          value={o?.[f.key] ?? ""}
                          onChange={(e) =>
                            setOverride(addon.id, {
                              [f.key]: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                          {currency || ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">
                  Using default rates from Tab 4.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

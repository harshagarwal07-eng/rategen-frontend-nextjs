"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { FDAddon, FDAddonType } from "@/types/fixed-departures";
import { isAgeBased, singleRateLabel } from "./tab-addons";

// Mirrors the per-pax / single-rate columns added in
// 20260425_fd_addon_departure_pricing_per_pax_columns.sql.
export interface AddonOverrideState {
  addon_id: string;
  enabled: boolean;
  override_price_adult: number | null;
  override_price_child: number | null;
  override_price_infant: number | null;
  override_price_total: number | null;
}

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

export function emptyAddonOverride(addonId: string): AddonOverrideState {
  return {
    addon_id: addonId,
    enabled: false,
    override_price_adult: null,
    override_price_child: null,
    override_price_infant: null,
    override_price_total: null,
  };
}

function bandsForAddon(addon: FDAddon): { adult: boolean; child: boolean; infant: boolean } {
  if (!addon.use_custom_age_policy) return { adult: true, child: true, infant: true };
  const has = (from: number | null, to: number | null) => !(from == null && to == null);
  return {
    adult: has(addon.custom_adult_age_from, addon.custom_adult_age_to),
    child: has(addon.custom_child_age_from, addon.custom_child_age_to),
    infant: has(addon.custom_infant_age_from, addon.custom_infant_age_to),
  };
}

function formatRate(value: number | null | undefined, currency: string | null): string {
  if (value == null) return "—";
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  return currency ? `${currency} ${formatted}` : formatted;
}

function defaultRatesLine(addon: FDAddon, currency: string | null): string | null {
  const t = addon.addon_type as FDAddonType;
  if (t === "multi_day_tour") return null;
  if (isAgeBased(t, addon.price_unit)) {
    const present = bandsForAddon(addon);
    const parts: string[] = [];
    if (present.adult) parts.push(`Adult: ${formatRate(addon.price_adult, currency)}`);
    if (present.child) parts.push(`Child: ${formatRate(addon.price_child, currency)}`);
    if (present.infant) parts.push(`Infant: ${formatRate(addon.price_infant, currency)}`);
    return parts.join(" · ");
  }
  return `${singleRateLabel(t, addon.price_unit)}: ${formatRate(addon.price_adult, currency)}`;
}

export function DepartureAddonPricingSection({ addons, overrides, onChange, currency }: Props) {
  if (addons.length === 0) return null;

  const overrideById = new Map(overrides.map((o) => [o.addon_id, o]));

  const setOverride = (addonId: string, patch: Partial<AddonOverrideState>) => {
    const existing = overrideById.get(addonId);
    const base: AddonOverrideState = existing ?? emptyAddonOverride(addonId);
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
        Override per-addon rates for this specific departure.
      </div>
      <div className="flex flex-col gap-2">
        {addons.map((addon) => {
          const o = overrideById.get(addon.id);
          const enabled = !!o?.enabled;
          const t = addon.addon_type as FDAddonType;
          const ageBased = isAgeBased(t, addon.price_unit);
          const isMultiDay = t === "multi_day_tour";
          const present = bandsForAddon(addon);
          const defaultLine = defaultRatesLine(addon, currency);

          return (
            <div key={addon.id} className="rounded-md border bg-background p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{addon.name}</span>
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {ADDON_TYPE_LABEL[addon.addon_type] ?? addon.addon_type}
                  </span>
                </div>
                {!isMultiDay && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Label className="text-xs">Override default rates</Label>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => setOverride(addon.id, { enabled: v })}
                    />
                  </div>
                )}
              </div>

              {isMultiDay ? (
                <div className="text-xs text-muted-foreground italic">
                  Multi-day tours are priced via their nested itinerary; no per-departure override.
                </div>
              ) : enabled ? (
                ageBased ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {present.adult && (
                      <RateField
                        label="Adult"
                        currency={currency}
                        value={o?.override_price_adult ?? null}
                        onChange={(v) => setOverride(addon.id, { override_price_adult: v })}
                      />
                    )}
                    {present.child && (
                      <RateField
                        label="Child"
                        currency={currency}
                        value={o?.override_price_child ?? null}
                        onChange={(v) => setOverride(addon.id, { override_price_child: v })}
                      />
                    )}
                    {present.infant && (
                      <RateField
                        label="Infant"
                        currency={currency}
                        value={o?.override_price_infant ?? null}
                        onChange={(v) => setOverride(addon.id, { override_price_infant: v })}
                      />
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <RateField
                      label={singleRateLabel(t, addon.price_unit)}
                      currency={currency}
                      value={o?.override_price_total ?? null}
                      onChange={(v) => setOverride(addon.id, { override_price_total: v })}
                    />
                  </div>
                )
              ) : (
                <div className="text-xs text-muted-foreground italic">
                  Using default from Tab 4{defaultLine ? ` — ${defaultLine}` : ""}.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RateField({
  label,
  currency,
  value,
  onChange,
}: {
  label: string;
  currency: string | null;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <Input
          type="number"
          min={0}
          step="0.01"
          className="h-8 pr-12"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
          {currency || ""}
        </span>
      </div>
    </div>
  );
}

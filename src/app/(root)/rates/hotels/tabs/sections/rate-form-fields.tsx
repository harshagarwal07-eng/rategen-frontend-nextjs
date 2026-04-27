"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { AgePolicyBand, ContractRoom, ContractTax } from "@/types/contract-tab2";
import type { MealPlan } from "@/types/contract-rates";
import {
  ageBandLabel,
  childPricingSubtitle,
  computeNetFromBar,
  DAY_LABELS_SHORT,
  daysToSet,
  formatTaxesSummary,
  setToDays,
  taxesForRoom,
  type ExtraAdultType,
  type LocalAgePricing,
  type LocalRate,
  type RatePriceType,
} from "./rates-shared";

const SECTION_LABEL_CLS =
  "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

interface RateFormFieldsProps {
  room: ContractRoom;
  rate: LocalRate;
  onChange: (next: LocalRate) => void;
  mealPlans: MealPlan[];
  agePolicies: AgePolicyBand[];
  contractTaxes: ContractTax[];
  contractRateBasis: "net" | "bar";
  disabled?: boolean;
}

export function RateFormFields({
  room,
  rate,
  onChange,
  mealPlans,
  agePolicies,
  contractTaxes,
  contractRateBasis,
  disabled = false,
}: RateFormFieldsProps) {
  const [childOpen, setChildOpen] = useState(false);

  function setField<K extends keyof LocalRate>(field: K, value: LocalRate[K]) {
    onChange({ ...rate, [field]: value });
  }

  const isBar = contractRateBasis === "bar" && rate.rate_type === "PRPN";
  const isPpppnBar = contractRateBasis === "bar" && rate.rate_type === "PPPN";

  const netPreview = computeNetFromBar(rate.bar_rate, rate.commission_percentage);

  const mealPlanGroups = useMemo(() => {
    const map = new Map<string, MealPlan[]>();
    for (const mp of mealPlans) {
      const group = mp.category === "gala" ? "Gala" : "Standard";
      const arr = map.get(group) ?? [];
      arr.push(mp);
      map.set(group, arr);
    }
    return map;
  }, [mealPlans]);

  const dayset = useMemo(() => daysToSet(rate.valid_days), [rate.valid_days]);
  function toggleDay(idx: number) {
    const next = new Set(dayset);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    if (next.size === 0) {
      // Refuse the empty-set state — keep at least one day on. Brief default
      // is all 7; an empty set would mean "rate never applies" which is not
      // a useful local state.
      next.add(idx);
    }
    setField("valid_days", setToDays(next));
  }

  const filteredTaxes = taxesForRoom(contractTaxes, room.id ?? "");

  // Non-adult policies only — adult is the implicit baseline.
  const childPolicies = agePolicies.filter(
    (b) => b.id && b.label.toLowerCase() !== "adult"
  );

  return (
    <div className="flex flex-col gap-4">
      {isPpppnBar && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          BAR pricing is not available on per-person (PPPN) rooms. Switch this
          room to per-room (PRPN) on the Rooms &amp; Seasons tab to enable BAR
          rates.
        </div>
      )}

      {/* ── Rate fields ── */}
      {rate.rate_type === "PRPN" ? (
        isBar ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumField
              label="Room Rate (BAR)"
              value={rate.bar_rate}
              onChange={(v) => setField("bar_rate", v)}
              disabled={disabled || isPpppnBar}
            />
            <NumField
              label="Commission %"
              value={rate.commission_percentage}
              onChange={(v) => setField("commission_percentage", v)}
              disabled={disabled || isPpppnBar}
              suffix="%"
            />
            <ReadonlyNet label="Net Rate" value={netPreview} />
            <NumField
              label="Single Rate"
              value={rate.single_rate}
              onChange={(v) => setField("single_rate", v)}
              disabled={disabled}
            />
            <ExtraAdultRow
              rate={rate}
              setField={setField}
              isBar
              disabled={disabled}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumField
              label="Room Rate"
              value={rate.room_rate}
              onChange={(v) => setField("room_rate", v)}
              disabled={disabled}
            />
            <NumField
              label="Single Rate"
              value={rate.single_rate}
              onChange={(v) => setField("single_rate", v)}
              disabled={disabled}
            />
            <ExtraAdultRow
              rate={rate}
              setField={setField}
              isBar={false}
              disabled={disabled}
            />
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumField
              label="Single Rate"
              value={rate.single_rate}
              onChange={(v) => setField("single_rate", v)}
              disabled={disabled}
            />
            <NumField
              label="Double Rate"
              value={rate.double_rate}
              onChange={(v) => setField("double_rate", v)}
              disabled={disabled}
            />
            <NumField
              label="Triple Rate"
              value={rate.triple_rate}
              onChange={(v) => setField("triple_rate", v)}
              disabled={disabled}
            />
            <NumField
              label="Quad Rate"
              value={rate.quad_rate}
              onChange={(v) => setField("quad_rate", v)}
              disabled={disabled}
            />
            <ExtraAdultRow
              rate={rate}
              setField={setField}
              isBar={false}
              disabled={disabled}
            />
          </div>
        </>
      )}

      {/* ── Meal plan + valid days + status ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className={SECTION_LABEL_CLS}>Meal Plan</label>
          <Select
            value={rate.meal_plan_id ?? undefined}
            onValueChange={(id) => {
              const mp = mealPlans.find((m) => m.id === id);
              onChange({
                ...rate,
                meal_plan_id: id,
                meal_plan: mp?.code ?? rate.meal_plan,
              });
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select meal plan…" />
            </SelectTrigger>
            <SelectContent>
              {Array.from(mealPlanGroups.entries()).map(([group, plans]) => (
                <div key={group}>
                  <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group}
                  </div>
                  {plans.map((mp) => (
                    <SelectItem key={mp.id} value={mp.id}>
                      {mp.name} ({mp.code})
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={SECTION_LABEL_CLS}>Status</label>
          <Select
            value={rate.status}
            onValueChange={(v) =>
              setField("status", v === "inactive" ? "inactive" : "active")
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className={SECTION_LABEL_CLS}>Valid Days</label>
        <div className="flex gap-1 flex-wrap">
          {DAY_LABELS_SHORT.map((d, i) => {
            const active = dayset.has(i);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(i)}
                disabled={disabled}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium border transition-colors disabled:opacity-50",
                  active
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted text-muted-foreground border-transparent"
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Taxes (read-only) ── */}
      {filteredTaxes.length > 0 && (
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <span className={cn(SECTION_LABEL_CLS, "mr-2")}>Taxes</span>
          <span className="text-xs text-muted-foreground">
            {formatTaxesSummary(filteredTaxes)}
          </span>
        </div>
      )}

      {/* ── Child pricing ── */}
      {childPolicies.length > 0 && (
        <div className="rounded-md border bg-muted/20">
          <button
            type="button"
            onClick={() => setChildOpen((o) => !o)}
            className="flex w-full items-center justify-between px-3 py-2 text-left"
          >
            <div className="flex items-center gap-2">
              {childOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className={SECTION_LABEL_CLS}>Child Pricing</span>
              {childPricingSubtitle(room) && (
                <span className="text-xs text-muted-foreground normal-case">
                  — {childPricingSubtitle(room)}
                </span>
              )}
            </div>
          </button>
          {childOpen && (
            <div className="border-t divide-y">
              {childPolicies.map((band) => {
                const cp =
                  rate.age_pricing.find((c) => c.age_policy_id === band.id) ??
                  null;
                if (!cp) return null;
                return (
                  <ChildPricingRow
                    key={band.id ?? band.label}
                    band={band}
                    pricing={cp}
                    rate={rate}
                    isBar={isBar}
                    disabled={disabled}
                    onChange={(next) =>
                      onChange({
                        ...rate,
                        age_pricing: rate.age_pricing.map((c) =>
                          c._localId === next._localId ? next : c
                        ),
                      })
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function NumField({
  label,
  value,
  onChange,
  suffix,
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className={SECTION_LABEL_CLS}>{label}</label>
      <div className="relative">
        <Input
          type="number"
          min={0}
          step={0.01}
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : parseFloat(e.target.value))
          }
          placeholder="0"
          className={cn("h-9 text-sm", suffix && "pr-7")}
          disabled={disabled}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ReadonlyNet({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={SECTION_LABEL_CLS}>{label}</label>
      <div className="h-9 px-3 flex items-center rounded-md border bg-muted/30 text-sm font-medium">
        {value != null ? `$${value.toFixed(2)}` : <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

function ExtraAdultRow({
  rate,
  setField,
  isBar,
  disabled,
}: {
  rate: LocalRate;
  setField: <K extends keyof LocalRate>(field: K, value: LocalRate[K]) => void;
  isBar: boolean;
  disabled?: boolean;
}) {
  const valueLabel =
    rate.extra_adult_supplement_type === "percentage"
      ? isBar
        ? "Extra Adult (% of BAR)"
        : "Extra Adult (% of Room)"
      : "Extra Adult Supplement";

  return (
    <div className="flex flex-col gap-1">
      <label className={SECTION_LABEL_CLS}>{valueLabel}</label>
      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          step={0.01}
          value={rate.extra_adult_supplement ?? ""}
          onChange={(e) =>
            setField(
              "extra_adult_supplement",
              e.target.value === "" ? null : parseFloat(e.target.value)
            )
          }
          placeholder="0"
          className="h-9 text-sm flex-1"
          disabled={disabled}
        />
        <FlatPercentToggle
          value={rate.extra_adult_supplement_type}
          onChange={(v) => setField("extra_adult_supplement_type", v)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function FlatPercentToggle({
  value,
  onChange,
  disabled,
}: {
  value: ExtraAdultType | RatePriceType;
  onChange: (v: ExtraAdultType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted/40 p-0.5 h-9">
      {(["fixed", "percentage"] as const).map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            disabled={disabled}
            className={cn(
              "px-2.5 text-xs font-medium rounded-sm transition-colors disabled:opacity-50",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "fixed" ? "Flat" : "%"}
          </button>
        );
      })}
    </div>
  );
}

function ChildPricingRow({
  band,
  pricing,
  rate,
  isBar,
  disabled,
  onChange,
}: {
  band: AgePolicyBand;
  pricing: LocalAgePricing;
  rate: LocalRate;
  isBar: boolean;
  disabled?: boolean;
  onChange: (next: LocalAgePricing) => void;
}) {
  const pctLabel = isBar ? "% of BAR" : "% of adult";

  function preview(value: number | null, type: RatePriceType): string | null {
    if (type !== "percentage" || value == null) return null;
    if (isBar && rate.bar_rate != null && rate.commission_percentage != null) {
      const childBar = (rate.bar_rate * value) / 100;
      const net = childBar * (1 - rate.commission_percentage / 100);
      return `= $${net.toFixed(2)} per child net`;
    }
    if (!isBar && rate.room_rate != null) {
      return `= $${((rate.room_rate * value) / 100).toFixed(2)} per child`;
    }
    return null;
  }

  return (
    <div className="px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{ageBandLabel(band)}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Free</span>
          <Switch
            checked={pricing.is_free}
            onCheckedChange={(v) => onChange({ ...pricing, is_free: v })}
            disabled={disabled}
          />
        </div>
      </div>
      {!pricing.is_free && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <NumField
            label="Max Free Count"
            value={pricing.max_free_count}
            onChange={(v) =>
              onChange({ ...pricing, max_free_count: v == null ? null : Math.max(0, Math.round(v)) })
            }
            disabled={disabled}
          />
          <div className="flex flex-col gap-1">
            <label className={SECTION_LABEL_CLS}>Without Bed</label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={pricing.without_bed_price ?? ""}
                onChange={(e) =>
                  onChange({
                    ...pricing,
                    without_bed_price:
                      e.target.value === ""
                        ? null
                        : parseFloat(e.target.value),
                  })
                }
                placeholder="0"
                className="h-9 text-sm flex-1"
                disabled={disabled}
              />
              <FlatPercentToggle
                value={pricing.without_bed_price_type}
                onChange={(v) =>
                  onChange({ ...pricing, without_bed_price_type: v })
                }
                disabled={disabled}
              />
            </div>
            {(() => {
              const p = preview(
                pricing.without_bed_price,
                pricing.without_bed_price_type
              );
              return p ? (
                <span className="text-[10px] text-primary">{p}</span>
              ) : null;
            })()}
          </div>
          <div className="flex flex-col gap-1">
            <label className={SECTION_LABEL_CLS}>With Bed</label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={pricing.with_bed_price ?? ""}
                onChange={(e) =>
                  onChange({
                    ...pricing,
                    with_bed_price:
                      e.target.value === ""
                        ? null
                        : parseFloat(e.target.value),
                  })
                }
                placeholder="0"
                className="h-9 text-sm flex-1"
                disabled={disabled}
              />
              <FlatPercentToggle
                value={pricing.with_bed_price_type}
                onChange={(v) =>
                  onChange({ ...pricing, with_bed_price_type: v })
                }
                disabled={disabled}
              />
            </div>
            {(() => {
              const p = preview(
                pricing.with_bed_price,
                pricing.with_bed_price_type
              );
              return p ? (
                <span className="text-[10px] text-primary">{p}</span>
              ) : null;
            })()}
          </div>
        </div>
      )}
      <div className="text-[10px] text-muted-foreground/70 sr-only">
        {pctLabel}
      </div>
    </div>
  );
}

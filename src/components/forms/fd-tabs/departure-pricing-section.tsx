"use client";

import { Input } from "@/components/ui/input";
import type { FDDeparturePricing } from "@/types/fixed-departures";

export type LandPricingState = Pick<
  FDDeparturePricing,
  "rate_single" | "rate_double" | "rate_triple" | "rate_child_no_bed" | "rate_child_extra_bed" | "rate_infant"
>;

export const EMPTY_LAND_PRICING: LandPricingState = {
  rate_single: null,
  rate_double: null,
  rate_triple: null,
  rate_child_no_bed: null,
  rate_child_extra_bed: null,
  rate_infant: null,
};

const LAND_RATE_FIELDS: { key: keyof LandPricingState; label: string }[] = [
  { key: "rate_single", label: "Single" },
  { key: "rate_double", label: "Double (per person)" },
  { key: "rate_triple", label: "Triple (per person)" },
  { key: "rate_child_no_bed", label: "Child (No Bed)" },
  { key: "rate_child_extra_bed", label: "Child (Extra Bed)" },
  { key: "rate_infant", label: "Infant" },
];

interface Props {
  value: LandPricingState;
  onChange: (patch: Partial<LandPricingState>) => void;
  currency: string | null;
}

export function DeparturePricingSection({ value, onChange, currency }: Props) {
  return (
    <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Land Pricing
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {LAND_RATE_FIELDS.map((f) => (
          <RateInput
            key={f.key}
            label={f.label}
            currency={currency}
            value={value[f.key]}
            onChange={(v) => onChange({ [f.key]: v } as Partial<LandPricingState>)}
          />
        ))}
      </div>
    </div>
  );
}

function RateInput({
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
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
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

export function minLandRate(p: LandPricingState | null | undefined): number | null {
  if (!p) return null;
  const values = [
    p.rate_single,
    p.rate_double,
    p.rate_triple,
    p.rate_child_no_bed,
    p.rate_child_extra_bed,
    p.rate_infant,
  ].filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (values.length === 0) return null;
  return Math.min(...values);
}

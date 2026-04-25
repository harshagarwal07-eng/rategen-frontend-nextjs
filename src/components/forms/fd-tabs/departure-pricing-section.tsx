"use client";

import { Input } from "@/components/ui/input";
import type { FDAgePolicy, FDDeparturePricing } from "@/types/fixed-departures";

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

type BandKey = "infant" | "child" | "adult";

// Each pricing field is gated by which package age band it belongs to. If the
// band was deleted at the package level (Tab 1), the field disappears here.
const LAND_RATE_FIELDS: {
  key: keyof LandPricingState;
  label: string;
  band: BandKey;
}[] = [
  { key: "rate_single", label: "Single", band: "adult" },
  { key: "rate_double", label: "Double per person", band: "adult" },
  { key: "rate_triple", label: "Triple per person", band: "adult" },
  { key: "rate_child_no_bed", label: "Child No Bed", band: "child" },
  { key: "rate_child_extra_bed", label: "Child Extra Bed", band: "child" },
  { key: "rate_infant", label: "Infant", band: "infant" },
];

function findBand(bands: FDAgePolicy[] | undefined, key: BandKey): FDAgePolicy | undefined {
  return (bands ?? []).find((b) => b.band_name?.toLowerCase() === key);
}

function bandSuffix(band: FDAgePolicy | undefined, label: string, key: BandKey): string {
  if (!band) return label;
  // For Adult-band fields like "Single / Double / Triple", the brief explicitly
  // wants "(Adult X-Y)". For child/infant, just the range.
  if (key === "adult") return `${label} (Adult ${band.age_from}-${band.age_to})`;
  return `${label} (${band.age_from}-${band.age_to})`;
}

interface Props {
  value: LandPricingState;
  onChange: (patch: Partial<LandPricingState>) => void;
  currency: string | null;
  packageBands?: FDAgePolicy[];
}

export function DeparturePricingSection({ value, onChange, currency, packageBands }: Props) {
  const visibleFields = LAND_RATE_FIELDS.filter((f) => !!findBand(packageBands, f.band));
  return (
    <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Land Pricing
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {visibleFields.map((f) => {
          const band = findBand(packageBands, f.band);
          return (
            <RateInput
              key={f.key}
              label={bandSuffix(band, f.label, f.band)}
              currency={currency}
              value={value[f.key]}
              onChange={(v) => onChange({ [f.key]: v } as Partial<LandPricingState>)}
            />
          );
        })}
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


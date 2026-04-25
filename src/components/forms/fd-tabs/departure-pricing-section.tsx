"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { FDAgePolicy, FDDeparturePricing } from "@/types/fixed-departures";

export type LandPricingState = Pick<
  FDDeparturePricing,
  "rate_single" | "rate_double" | "rate_triple" | "rate_child_no_bed" | "rate_child_extra_bed" | "rate_infant"
>;

export interface RateSource {
  id: string;
  departure_date: string;
  pricing: LandPricingState;
}

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

function pricingHasAnyRate(p: LandPricingState): boolean {
  return Object.values(p).some((v) => v != null);
}

function formatRateInline(value: number | null, currency: string | null): string {
  if (value == null) return "—";
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  return currency ? `${currency} ${formatted}` : formatted;
}

interface Props {
  value: LandPricingState;
  onChange: (patch: Partial<LandPricingState>) => void;
  currency: string | null;
  packageBands?: FDAgePolicy[];
  // Optional copy-rates affordance: list of source departures + a callback
  // that replaces the current pricing object. Component handles the picker
  // popover and the overwrite-confirm dialog.
  rateSources?: RateSource[];
  excludeSourceId?: string;
}

export function DeparturePricingSection({
  value,
  onChange,
  currency,
  packageBands,
  rateSources,
  excludeSourceId,
}: Props) {
  const visibleFields = LAND_RATE_FIELDS.filter((f) => !!findBand(packageBands, f.band));
  return (
    <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Land Pricing
        </div>
        {rateSources && rateSources.length > 0 && (
          <CopyRatesPicker
            sources={rateSources}
            excludeId={excludeSourceId}
            currentPricing={value}
            currency={currency}
            onApply={(src) => {
              onChange(src);
            }}
          />
        )}
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

interface CopyRatesPickerProps {
  sources: RateSource[];
  excludeId?: string;
  currentPricing: LandPricingState;
  currency: string | null;
  onApply: (sourcePricing: LandPricingState) => void;
}

function CopyRatesPicker({
  sources,
  excludeId,
  currentPricing,
  currency,
  onApply,
}: CopyRatesPickerProps) {
  const [open, setOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<RateSource | null>(null);

  // Filter self, sort by date desc.
  const visible = useMemo(() => {
    return sources
      .filter((s) => !excludeId || s.id !== excludeId)
      .slice()
      .sort((a, b) => b.departure_date.localeCompare(a.departure_date));
  }, [sources, excludeId]);

  if (visible.length === 0) return null;

  const targetHasRates = pricingHasAnyRate(currentPricing);

  const apply = (src: RateSource) => {
    onApply(src.pricing);
    setOpen(false);
    setConfirmTarget(null);
  };

  const handlePick = (src: RateSource) => {
    if (targetHasRates) {
      setConfirmTarget(src);
    } else {
      apply(src);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs">
            Copy rates from another departure
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="max-h-72 overflow-y-auto py-1">
            {visible.map((s) => {
              const hasRates = pricingHasAnyRate(s.pricing);
              const dateStr = s.departure_date
                ? format(parseISO(s.departure_date), "MMM d, yyyy")
                : "(no date)";
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!hasRates}
                  onClick={() => handlePick(s)}
                  className="w-full text-left px-3 py-2 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col gap-0.5"
                >
                  <span className="text-sm font-medium">{dateStr}</span>
                  {hasRates ? (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Double: {formatRateInline(s.pricing.rate_double, currency)} ·
                      {" "}Single: {formatRateInline(s.pricing.rate_single, currency)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">(no rates set)</span>
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog
        open={confirmTarget !== null}
        onOpenChange={(o) => !o && setConfirmTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing rates?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget
                ? `Replace existing rates with values from ${format(parseISO(confirmTarget.departure_date), "MMM d, yyyy")}?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmTarget && apply(confirmTarget)}>
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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


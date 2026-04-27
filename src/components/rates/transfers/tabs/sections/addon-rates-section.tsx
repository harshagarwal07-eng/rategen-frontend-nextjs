"use client";

// Per-age-band rate editor for an add-on. Mirrors the SIC rate row in
// season cards (flex-wrap of {band (age_from-age_to)} / Input). Title
// is "Per Pax" — same data shape, different context. Parent owns
// persist via `replaceTransferAddonRates(addonId, rates)`.

import { Input } from "@/components/ui/input";
import { TransferAddonAgePolicyBand } from "@/types/transfers";

export type AddonRateMap = Record<string, string>; // band_name → input string

export function ratesToMap(
  rates: { band_name: string; rate: number | null }[],
): AddonRateMap {
  return Object.fromEntries(
    rates.map((r) => [r.band_name, r.rate != null ? String(r.rate) : ""]),
  );
}

export function mapToRates(
  bands: TransferAddonAgePolicyBand[],
  map: AddonRateMap,
): { band_name: string; rate: number | null }[] {
  return bands.map((b) => {
    const raw = map[b.band_name];
    const parsed =
      raw != null && raw !== "" ? parseFloat(raw) : null;
    return {
      band_name: b.band_name,
      rate: parsed == null || isNaN(parsed) ? null : parsed,
    };
  });
}

interface AddonRatesSectionProps {
  bands: TransferAddonAgePolicyBand[];
  values: AddonRateMap;
  onChange: (next: AddonRateMap) => void;
}

export default function AddonRatesSection({
  bands,
  values,
  onChange,
}: AddonRatesSectionProps) {
  const sorted = [...bands].sort(
    (a, b) => (a.band_order ?? 0) - (b.band_order ?? 0),
  );

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Per Pax
      </p>
      <div className="flex flex-wrap gap-3">
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Define age bands above first to set per-pax rates.
          </p>
        ) : (
          sorted.map((band) => (
            <div
              key={`${band.band_name}-${band.band_order ?? 0}`}
              className="flex flex-col gap-0.5"
            >
              <label className="text-[10px] font-medium text-muted-foreground">
                {band.band_name} ({band.age_from}–{band.age_to})
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={values[band.band_name] ?? ""}
                onChange={(e) =>
                  onChange({ ...values, [band.band_name]: e.target.value })
                }
                placeholder="0"
                className="h-7 w-28 text-xs"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

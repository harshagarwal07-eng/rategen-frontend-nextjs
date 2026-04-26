"use client";

// Per-age-band rate editor for an add-on. Renders a row per age band
// defined in the parent's age-policy section. The user enters a flat
// rate (or leaves it blank → null) per band. The parent owns persist
// via `replaceAddonRates(addonId, rates)`.

import { Input } from "@/components/ui/input";
import { TourAddonAgePolicyBand } from "@/types/tours";

export type AddonRateMap = Record<string, string>; // band_name → input string

export function ratesToMap(
  rates: { band_name: string; rate: number | null }[],
): AddonRateMap {
  return Object.fromEntries(
    rates.map((r) => [r.band_name, r.rate != null ? String(r.rate) : ""]),
  );
}

export function mapToRates(
  bands: TourAddonAgePolicyBand[],
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
  bands: TourAddonAgePolicyBand[];
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
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        Per Age Band Rates
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        Rate per age band — fill only the bands that apply.
      </p>
      {sorted.length === 0 ? (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
          No age bands defined. Add age bands in the Age Policy section above
          first.
        </p>
      ) : (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b">
              <th className="py-1.5 pr-3 text-left font-medium text-muted-foreground w-1/2">
                Age Band
              </th>
              <th className="py-1.5 pr-2 text-left font-medium text-muted-foreground w-1/4">
                Age Range
              </th>
              <th className="py-1.5 text-left font-medium text-muted-foreground">
                Rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((band) => (
              <tr key={`${band.band_name}-${band.band_order ?? 0}`}>
                <td className="py-1.5 pr-3">{band.band_name}</td>
                <td className="py-1.5 pr-2 text-muted-foreground">
                  {band.age_from}–{band.age_to} yrs
                </td>
                <td className="py-1.5">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={values[band.band_name] ?? ""}
                    onChange={(e) =>
                      onChange({
                        ...values,
                        [band.band_name]: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="h-7 w-28 text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

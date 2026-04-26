"use client";

// Per-day itinerary builder for `category === 'multi_day'` packages.
// Stays purely client-side — Tab 2 calls `replaceItineraryDays` on save.
// When duration_days changes, rows expand/contract preserving prior data
// (auto-fills next day's origin from the previous day's destination).

import { useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight } from "lucide-react";
import GeoNodePicker from "@/components/shared/geo-node-picker";
import { TourItineraryDay } from "@/types/tours";

export type ItineraryRow = TourItineraryDay & {
  _autoFilledStart: boolean;
};

export function buildItineraryRows(
  count: number,
  initial: TourItineraryDay[],
): ItineraryRow[] {
  const rows: ItineraryRow[] = [];
  for (let i = 0; i < count; i++) {
    const existing = initial.find((d) => d.day_number === i + 1);
    rows.push({
      day_number: i + 1,
      origin_city_id: existing?.origin_city_id ?? null,
      destination_city_id: existing?.destination_city_id ?? null,
      description: existing?.description ?? null,
      _autoFilledStart: false,
    });
  }
  return rows;
}

interface MultiDayItineraryBuilderProps {
  durationDays: number;
  rows: ItineraryRow[];
  onChange: (next: ItineraryRow[]) => void;
}

export default function MultiDayItineraryBuilder({
  durationDays,
  rows,
  onChange,
}: MultiDayItineraryBuilderProps) {
  // Resize on duration change.
  useEffect(() => {
    if (rows.length === durationDays) return;
    if (durationDays > rows.length) {
      const next: ItineraryRow[] = [...rows];
      for (let i = rows.length; i < durationDays; i++) {
        const prevEnd = next[i - 1]?.destination_city_id ?? null;
        next.push({
          day_number: i + 1,
          origin_city_id: prevEnd,
          destination_city_id: null,
          description: null,
          _autoFilledStart: !!prevEnd,
        });
      }
      onChange(next);
    } else {
      onChange(rows.slice(0, durationDays));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationDays]);

  function update(idx: number, patch: Partial<ItineraryRow>) {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    // Cascade dest → next origin when not yet manually set.
    if ("destination_city_id" in patch && idx < next.length - 1) {
      const nextRow = next[idx + 1];
      if (!nextRow.origin_city_id || nextRow._autoFilledStart) {
        next[idx + 1] = {
          ...nextRow,
          origin_city_id: patch.destination_city_id ?? null,
          _autoFilledStart: true,
        };
      }
    }
    if ("origin_city_id" in patch && patch.origin_city_id !== undefined) {
      next[idx] = { ...next[idx], _autoFilledStart: false };
    }
    onChange(next);
  }

  if (durationDays === 0) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Day-by-Day Itinerary
        </p>
        <div className="rounded-md border-2 border-dashed py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Set duration (days) above to build the itinerary.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Day-by-Day Itinerary ({durationDays}{" "}
        {durationDays === 1 ? "day" : "days"})
      </p>
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={row.day_number} className="rounded-md border p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold w-12 shrink-0">
                Day {row.day_number}
              </span>
              <div className="flex-1">
                <GeoNodePicker
                  value={row.origin_city_id}
                  onChange={(id) => update(idx, { origin_city_id: id })}
                  placeholder="Start city…"
                />
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <GeoNodePicker
                  value={row.destination_city_id}
                  onChange={(id) => update(idx, { destination_city_id: id })}
                  placeholder="End city…"
                />
              </div>
            </div>
            <Textarea
              rows={2}
              className="text-xs resize-y"
              placeholder={`Day ${row.day_number} description — activities, transfers, meals…`}
              value={row.description ?? ""}
              onChange={(e) =>
                update(idx, { description: e.target.value || null })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

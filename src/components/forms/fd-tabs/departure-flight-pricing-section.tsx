"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FlightPricingRow {
  flight_group: string;
  price_adult: number | null;
  price_child: number | null;
  price_infant: number | null;
}

interface Props {
  // Group names defined in Tab 5 (Flights & Visa). One pricing row is rendered
  // per group; rows for groups removed from Tab 5 are dropped silently.
  flightGroups: string[];
  value: FlightPricingRow[];
  onChange: (next: FlightPricingRow[]) => void;
  currency: string | null;
}

export function DepartureFlightPricingSection({ flightGroups, value, onChange, currency }: Props) {
  if (flightGroups.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Flight Pricing (per person)
        </div>
        <p className="text-xs text-muted-foreground italic">
          Define flight groups in Tab 5 — Flights & Visa to add per-departure pricing here.
        </p>
      </div>
    );
  }

  const byGroup = new Map(value.map((r) => [r.flight_group, r]));
  const cur = currency ?? "$";

  const updateRow = (groupName: string, patch: Partial<FlightPricingRow>) => {
    const existing = byGroup.get(groupName) ?? {
      flight_group: groupName,
      price_adult: null,
      price_child: null,
      price_infant: null,
    };
    const next: FlightPricingRow = { ...existing, ...patch };
    const others = value.filter((r) => r.flight_group !== groupName);
    onChange([...others, next]);
  };

  return (
    <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Flight Pricing (per person)
        </div>
        <p className="text-xs text-muted-foreground">
          Flight age bands are fixed: Infant 0–1, Child 2–11, Adult 12+.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {flightGroups.map((groupName) => {
          const row = byGroup.get(groupName);
          return (
            <div key={groupName} className="rounded border bg-background p-2 flex flex-col gap-2">
              <div className="text-sm font-medium">{groupName}</div>
              <div className="grid grid-cols-3 gap-2">
                <PriceInput
                  label={`Adult (12+ yrs) ${cur}`}
                  value={row?.price_adult ?? null}
                  onChange={(v) => updateRow(groupName, { price_adult: v })}
                />
                <PriceInput
                  label={`Child (2–11 yrs) ${cur}`}
                  value={row?.price_child ?? null}
                  onChange={(v) => updateRow(groupName, { price_child: v })}
                />
                <PriceInput
                  label={`Infant (0–1 yrs) ${cur}`}
                  value={row?.price_infant ?? null}
                  onChange={(v) => updateRow(groupName, { price_infant: v })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PriceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        step="0.01"
        className="h-8"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}

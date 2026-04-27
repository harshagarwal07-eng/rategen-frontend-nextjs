"use client";

// Season rate sections, driven by sales_mode. Section visibility lives
// in season-card.tsx; this file owns the editors themselves:
//
//   BandRatesSection      — Ticket / Shared (per-band rows)
//   PrivateRatesSection   — Private / Exclusive (per-pax + tiered modes)
//   VehicleRatesSection   — Private / Exclusive (4-col simplified table)
//   TotalRateSection      — Ticket / Private / Exclusive (single row)
//   ChildInfantDiscountSection — Private / Exclusive

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import http from "@/lib/api";
import {
  TourAgePolicyBand,
  TourDiscountType,
  TourPaxRate,
  TourPrivatePerPaxRate,
  TourPrivateRateMode,
  TourVehicleRate,
} from "@/types/tours";

// ─── Vehicle types cache (module-singleton, shared across rows) ────────

type VehicleType = {
  id: string;
  brand: string | null;
  code: string;
  label: string;
  pax_capacity: number | null;
  has_luggage_variant: boolean;
  pax_capacity_with_luggage: number | null;
  luggage_capacity: number | null;
};

let vehicleTypesCache: VehicleType[] | null = null;
let vehicleTypesPromise: Promise<VehicleType[]> | null = null;
const subscribers = new Set<(types: VehicleType[]) => void>();

function publish(next: VehicleType[]) {
  vehicleTypesCache = next;
  subscribers.forEach((fn) => fn(next));
}

async function loadVehicleTypes(): Promise<VehicleType[]> {
  if (vehicleTypesCache) return vehicleTypesCache;
  if (vehicleTypesPromise) return vehicleTypesPromise;
  vehicleTypesPromise = http
    .get<VehicleType[]>("/api/geo/vehicle-types")
    .then((res) => {
      if (
        res &&
        typeof res === "object" &&
        "error" in res &&
        (res as { error?: unknown }).error
      ) {
        vehicleTypesPromise = null;
        throw new Error(String((res as { error: unknown }).error));
      }
      const data = (res as VehicleType[]) ?? [];
      vehicleTypesPromise = null;
      publish(data);
      return data;
    });
  return vehicleTypesPromise;
}

function useVehicleTypes(): VehicleType[] {
  const [types, setTypes] = useState<VehicleType[]>(vehicleTypesCache ?? []);
  useEffect(() => {
    let cancelled = false;
    const sub = (next: VehicleType[]) => {
      if (!cancelled) setTypes(next);
    };
    subscribers.add(sub);
    loadVehicleTypes()
      .then((d) => {
        if (!cancelled) setTypes(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      subscribers.delete(sub);
    };
  }, []);
  return types;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function num(v: number | null | undefined): string {
  if (v == null) return "";
  return v === 0 ? "" : String(v);
}
function parseNum(s: string): number {
  return parseFloat(s) || 0;
}
function parseNullNum(s: string): number | null {
  if (s === "") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ─── Per-band rates (Ticket / Shared) ──────────────────────────────────

export type PaxRateRow = {
  band_name: string;
  rate: string;
};

export function paxRatesToRows(
  rates: TourPaxRate[],
  bands: TourAgePolicyBand[],
): PaxRateRow[] {
  // Always one row per band; merge in saved rates by band_name.
  const map = new Map<string, number>();
  for (const r of rates) map.set(r.band_name.toLowerCase(), r.rate);
  return bands.map((b) => ({
    band_name: b.band_name,
    rate: num(map.get(b.band_name.toLowerCase())),
  }));
}

export function rowsToPaxRates(rows: PaxRateRow[]): TourPaxRate[] {
  return rows
    .filter((r) => r.rate !== "")
    .map((r) => ({
      band_name: r.band_name.trim(),
      rate: parseNum(r.rate),
    }));
}

interface BandRatesSectionProps {
  title: string;
  rows: PaxRateRow[];
  bands: TourAgePolicyBand[];
  onChange: (rows: PaxRateRow[]) => void;
}

export function BandRatesSection({
  title,
  rows,
  bands,
  onChange,
}: BandRatesSectionProps) {
  function set(idx: number, value: string) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, rate: value } : r)));
  }

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </p>
      <div className="flex flex-wrap gap-3">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Define age bands on Tab 2 first to set rates.
          </p>
        ) : (
          rows.map((row, idx) => {
            const band = bands.find((b) => b.band_name === row.band_name);
            const sub = band ? `(${band.age_from}–${band.age_to})` : "";
            return (
              <div key={`${row.band_name}-${idx}`} className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium text-muted-foreground">
                  {row.band_name} {sub}
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={row.rate}
                  onChange={(e) => set(idx, e.target.value)}
                  placeholder="0"
                  className="h-7 w-28 text-xs"
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Pvt Per Pax — Per Pax mode (1..MAX_PAX_CELLS) ─────────────────────

export type PrivateCell = { _key: string; pax_count: number; rate: string };

const MAX_PAX_CELLS = 20;
const MAX_TIER_PAX = 100;

export function privateRatesToCells(
  rates: TourPrivatePerPaxRate[],
): PrivateCell[] {
  // Per-pax cells: rows where min_pax==max_pax==pax_count (or both null).
  const seeded = [...rates]
    .filter((r) => {
      const min = r.min_pax ?? r.pax_count;
      const max = r.max_pax ?? r.pax_count;
      return min === max;
    })
    .sort((a, b) => a.pax_count - b.pax_count)
    .map((r, i) => ({
      _key: `pp-${r.pax_count}-${i}`,
      pax_count: r.pax_count,
      rate: r.rate > 0 ? String(r.rate) : "",
    }));
  return seeded.length > 0
    ? seeded
    : [{ _key: `pp-1-${Date.now()}`, pax_count: 1, rate: "" }];
}

export function cellsToPrivateRates(
  cells: PrivateCell[],
): TourPrivatePerPaxRate[] {
  return cells
    .filter((c) => c.rate !== "")
    .map((c) => ({
      pax_count: c.pax_count,
      rate: parseNum(c.rate),
      min_pax: c.pax_count,
      max_pax: c.pax_count,
    }));
}

// ─── Pvt Per Pax — Tiered mode (min..max..rate, up to 100) ─────────────

export type PrivateTierRow = {
  _key: string;
  min_pax: string;
  max_pax: string;
  rate: string;
};

export function privateRatesToTiers(
  rates: TourPrivatePerPaxRate[],
): PrivateTierRow[] {
  const seeded = [...rates]
    .filter((r) => {
      const min = r.min_pax ?? r.pax_count;
      const max = r.max_pax ?? r.pax_count;
      return min !== max;
    })
    .sort((a, b) => (a.min_pax ?? a.pax_count) - (b.min_pax ?? b.pax_count))
    .map((r, i) => ({
      _key: `tr-${i}-${Date.now()}`,
      min_pax: String(r.min_pax ?? r.pax_count),
      max_pax: String(r.max_pax ?? r.pax_count),
      rate: r.rate > 0 ? String(r.rate) : "",
    }));
  return seeded.length > 0
    ? seeded
    : [{ _key: `tr-0-${Date.now()}`, min_pax: "1", max_pax: "1", rate: "" }];
}

export function tiersToPrivateRates(
  rows: PrivateTierRow[],
): TourPrivatePerPaxRate[] {
  return rows
    .filter((r) => r.rate !== "" && r.min_pax !== "" && r.max_pax !== "")
    .map((r) => {
      const min = Math.max(1, parseInt(r.min_pax, 10) || 1);
      const max = Math.min(MAX_TIER_PAX, parseInt(r.max_pax, 10) || min);
      return {
        // pax_count is NOT NULL on the table; back-compat to min.
        pax_count: min,
        rate: parseNum(r.rate),
        min_pax: min,
        max_pax: Math.max(min, max),
      };
    });
}

/** Returns per-row error messages ("" when row is OK). */
export function validateTiers(rows: PrivateTierRow[]): string[] {
  const errs: string[] = rows.map(() => "");
  const parsed = rows.map((r, i) => ({
    i,
    min: parseInt(r.min_pax, 10) || 0,
    max: parseInt(r.max_pax, 10) || 0,
  }));
  for (const p of parsed) {
    if (p.min < 1) errs[p.i] = "Min must be ≥ 1.";
    else if (p.max > MAX_TIER_PAX) errs[p.i] = `Max must be ≤ ${MAX_TIER_PAX}.`;
    else if (p.max < p.min) errs[p.i] = "Max must be ≥ min.";
  }
  // Overlap check (after individual validity).
  for (let i = 0; i < parsed.length; i++) {
    if (errs[i]) continue;
    for (let j = i + 1; j < parsed.length; j++) {
      if (errs[j]) continue;
      const a = parsed[i];
      const b = parsed[j];
      if (a.max >= b.min && b.max >= a.min) {
        errs[i] = `Overlaps tier ${j + 1}.`;
        errs[j] = `Overlaps tier ${i + 1}.`;
      }
    }
  }
  return errs;
}

interface PrivateRatesSectionProps {
  mode: TourPrivateRateMode;
  cells: PrivateCell[];
  tiers: PrivateTierRow[];
  onModeChange: (m: TourPrivateRateMode) => void;
  onCellsChange: (cells: PrivateCell[]) => void;
  onTiersChange: (tiers: PrivateTierRow[]) => void;
}

export function PrivateRatesSection({
  mode,
  cells,
  tiers,
  onModeChange,
  onCellsChange,
  onTiersChange,
}: PrivateRatesSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Pvt Per Pax Rate
        </p>
        <div className="inline-flex rounded-md border bg-muted/40 p-0.5 h-7">
          {(["per_pax", "tiered"] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className={cn(
                  "px-2.5 text-xs font-medium rounded-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "per_pax" ? "Per Pax" : "Tiered"}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "per_pax" ? (
        <PerPaxCellsView cells={cells} onChange={onCellsChange} />
      ) : (
        <TieredRowsView tiers={tiers} onChange={onTiersChange} />
      )}
    </div>
  );
}

function PerPaxCellsView({
  cells,
  onChange,
}: {
  cells: PrivateCell[];
  onChange: (next: PrivateCell[]) => void;
}) {
  function nextPax(): number | null {
    const used = new Set(cells.map((c) => c.pax_count));
    for (let n = 1; n <= MAX_PAX_CELLS; n++) {
      if (!used.has(n)) return n;
    }
    return null;
  }
  function add() {
    const n = nextPax();
    if (n == null) return;
    onChange([
      ...cells,
      { _key: `pp-${n}-${Date.now()}`, pax_count: n, rate: "" },
    ]);
  }
  function remove(key: string) {
    if (cells.length === 1) return;
    onChange(cells.filter((c) => c._key !== key));
  }
  function setRate(key: string, value: string) {
    onChange(cells.map((c) => (c._key === key ? { ...c, rate: value } : c)));
  }
  const sorted = [...cells].sort((a, b) => a.pax_count - b.pax_count);
  const canAdd = nextPax() !== null;
  return (
    <div className="flex flex-wrap gap-3">
      {sorted.map((c) => (
        <div key={c._key} className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2 w-24">
            <label className="text-[10px] font-medium text-muted-foreground">
              {c.pax_count} pax
            </label>
            {sorted.length > 1 && (
              <button
                type="button"
                className="text-muted-foreground/60 hover:text-destructive"
                onClick={() => remove(c._key)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={c.rate}
            onChange={(e) => setRate(c._key, e.target.value)}
            placeholder="0"
            className="h-7 w-24 text-xs"
          />
        </div>
      ))}
      {canAdd && (
        <div className="flex flex-col gap-0.5">
          <div className="text-[10px] select-none text-transparent">add</div>
          <button
            type="button"
            onClick={add}
            className="h-7 px-3 rounded border border-dashed text-xs text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add pax tier
          </button>
        </div>
      )}
    </div>
  );
}

function TieredRowsView({
  tiers,
  onChange,
}: {
  tiers: PrivateTierRow[];
  onChange: (next: PrivateTierRow[]) => void;
}) {
  const errs = validateTiers(tiers);
  function set(i: number, patch: Partial<PrivateTierRow>) {
    onChange(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }
  function add() {
    // Suggest min = previous max + 1
    const last = tiers[tiers.length - 1];
    const lastMax = last ? parseInt(last.max_pax, 10) || 0 : 0;
    const min = Math.min(MAX_TIER_PAX, lastMax + 1) || 1;
    onChange([
      ...tiers,
      {
        _key: `tr-${Date.now()}-${Math.random()}`,
        min_pax: String(min),
        max_pax: String(Math.min(MAX_TIER_PAX, min)),
        rate: "",
      },
    ]);
  }
  function remove(i: number) {
    if (tiers.length === 1) return;
    onChange(tiers.filter((_, idx) => idx !== i));
  }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[80px_80px_1fr_28px] gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Min Pax</span>
        <span>Max Pax</span>
        <span>Rate</span>
        <span />
      </div>
      {tiers.map((t, i) => (
        <div key={t._key} className="space-y-1">
          <div className="grid grid-cols-[80px_80px_1fr_28px] gap-2 items-center">
            <Input
              type="number"
              min={1}
              max={MAX_TIER_PAX}
              value={t.min_pax}
              onChange={(e) => set(i, { min_pax: e.target.value })}
              className="h-7 text-xs"
            />
            <Input
              type="number"
              min={1}
              max={MAX_TIER_PAX}
              value={t.max_pax}
              onChange={(e) => set(i, { max_pax: e.target.value })}
              className="h-7 text-xs"
            />
            <Input
              type="number"
              min={0}
              step={0.01}
              value={t.rate}
              onChange={(e) => set(i, { rate: e.target.value })}
              placeholder="0"
              className="h-7 text-xs"
            />
            <button
              type="button"
              className="text-muted-foreground/60 hover:text-destructive disabled:opacity-30"
              onClick={() => remove(i)}
              disabled={tiers.length === 1}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          {errs[i] && (
            <p className="text-[10px] text-destructive pl-1">{errs[i]}</p>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={add}
      >
        <Plus className="h-3 w-3" /> Add tier
      </Button>
    </div>
  );
}

// ─── Vehicle rates — simplified to 4 columns for the new spec ──────────
// Vehicle Type, Brand (read-only from master), Max Pax (read-only from
// master, editable), Rate. Backend extras (max_pax_with_luggage,
// max_luggage, supplement_*, kms/hrs) are kept in state at empty defaults
// so the existing PUT shape still saves.

export type VehicleRow = {
  _key: string;
  vehicle_type_id: string;
  brand: string | null;
  label: string;
  rate: string;
  max_pax: string;
  max_pax_with_luggage: string;
  max_luggage: string;
  max_kms_day: string;
  max_hrs_day: string;
  supplement_hr: string;
  supplement_km: string;
};

export function vehicleRatesToRows(rates: TourVehicleRate[]): VehicleRow[] {
  return rates.map((r, i) => ({
    _key: r.id ?? `vr-${i}-${Math.random()}`,
    vehicle_type_id: r.vehicle_type_id,
    brand: r.vehicle_types?.brand ?? null,
    label: r.vehicle_types?.label ?? "",
    rate: num(r.rate),
    max_pax: num(r.max_pax),
    max_pax_with_luggage: num(r.max_pax_with_luggage),
    max_luggage: num(r.max_luggage),
    max_kms_day: num(r.max_kms_day),
    max_hrs_day: num(r.max_hrs_day),
    supplement_hr: num(r.supplement_hr),
    supplement_km: num(r.supplement_km),
  }));
}

export function rowsToVehicleRates(rows: VehicleRow[]): TourVehicleRate[] {
  return rows
    .filter((r) => r.vehicle_type_id)
    .map((r) => ({
      vehicle_type_id: r.vehicle_type_id,
      rate: parseNum(r.rate),
      max_pax: parseNullNum(r.max_pax),
      max_pax_with_luggage: parseNullNum(r.max_pax_with_luggage),
      max_luggage: parseNullNum(r.max_luggage),
      max_kms_day: parseNullNum(r.max_kms_day),
      max_hrs_day: parseNullNum(r.max_hrs_day),
      supplement_hr: parseNullNum(r.supplement_hr),
      supplement_km: parseNullNum(r.supplement_km),
    }));
}

interface VehicleRatesSectionProps {
  rows: VehicleRow[];
  onRowsChange: (rows: VehicleRow[]) => void;
}

export function VehicleRatesSection({
  rows,
  onRowsChange,
}: VehicleRatesSectionProps) {
  const vehicleTypes = useVehicleTypes();

  function addRow() {
    onRowsChange([
      ...rows,
      {
        _key: `vr-new-${Date.now()}-${Math.random()}`,
        vehicle_type_id: "",
        brand: null,
        label: "",
        rate: "",
        max_pax: "",
        max_pax_with_luggage: "",
        max_luggage: "",
        max_kms_day: "",
        max_hrs_day: "",
        supplement_hr: "",
        supplement_km: "",
      },
    ]);
  }

  function deleteRow(key: string) {
    onRowsChange(rows.filter((r) => r._key !== key));
  }

  const pickVehicle = useCallback(
    (key: string, vehicleTypeId: string) => {
      const vt = vehicleTypes.find((v) => v.id === vehicleTypeId);
      if (!vt) return;
      onRowsChange(
        rows.map((r) =>
          r._key === key
            ? {
                ...r,
                vehicle_type_id: vt.id,
                brand: vt.brand,
                label: vt.label,
                max_pax: r.max_pax || num(vt.pax_capacity),
                max_pax_with_luggage:
                  r.max_pax_with_luggage || num(vt.pax_capacity_with_luggage),
                max_luggage: r.max_luggage || num(vt.luggage_capacity),
              }
            : r,
        ),
      );
    },
    [rows, vehicleTypes, onRowsChange],
  );

  function updateField(
    key: string,
    field: "rate" | "max_pax",
    value: string,
  ) {
    onRowsChange(rows.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  }

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Vehicle Rates
      </p>

      <div className="space-y-2 mb-2">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No vehicles yet. Click &quot;Add Vehicle&quot; to start.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row._key} className="rounded-md border p-2">
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_80px_minmax(0,1fr)_28px] gap-2 items-end">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Vehicle Type
                  </label>
                  <Select
                    value={row.vehicle_type_id || ""}
                    onValueChange={(v) => pickVehicle(row._key, v)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select vehicle…">
                        {row.vehicle_type_id ? row.label : "Select vehicle…"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((vt) => (
                        <SelectItem
                          key={vt.id}
                          value={vt.id}
                          className="text-xs"
                        >
                          {vt.brand ? `${vt.brand} — ${vt.label}` : vt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Brand
                  </label>
                  <div className="h-7 flex items-center px-2 text-xs text-muted-foreground truncate">
                    {row.brand ?? (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Max Pax
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={row.max_pax}
                    onChange={(e) =>
                      updateField(row._key, "max_pax", e.target.value)
                    }
                    placeholder="—"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Rate
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={row.rate}
                    onChange={(e) => updateField(row._key, "rate", e.target.value)}
                    placeholder="0"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex items-center pb-1">
                  <button
                    type="button"
                    className="p-1 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteRow(row._key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={addRow}
      >
        <Plus className="h-3 w-3" /> Add Vehicle
      </Button>
    </div>
  );
}

// ─── Total Rate (single row: rate + max_capacity) ──────────────────────

interface TotalRateSectionProps {
  rate: string;
  maxCapacity: string;
  onChange: (v: { rate: string; maxCapacity: string }) => void;
}

export function TotalRateSection({
  rate,
  maxCapacity,
  onChange,
}: TotalRateSectionProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Total Rate
      </p>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium text-muted-foreground">
            Rate
          </label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={rate}
            onChange={(e) => onChange({ rate: e.target.value, maxCapacity })}
            placeholder="0"
            className="h-7 w-32 text-xs"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium text-muted-foreground">
            Max Capacity
          </label>
          <Input
            type="number"
            min={0}
            value={maxCapacity}
            onChange={(e) => onChange({ rate, maxCapacity: e.target.value })}
            placeholder="—"
            className="h-7 w-32 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Child / Infant discount ───────────────────────────────────────────

interface DiscountRowProps {
  label: string;
  type: TourDiscountType | null;
  value: string;
  onTypeChange: (t: TourDiscountType) => void;
  onValueChange: (v: string) => void;
}

function DiscountRow({
  label,
  type,
  value,
  onTypeChange,
  onValueChange,
}: DiscountRowProps) {
  const effectiveType: TourDiscountType = type ?? "percent";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground min-w-[5rem]">
        {label}
      </span>
      <div className="inline-flex rounded-md border bg-muted/40 p-0.5 h-7">
        {(["percent", "fixed"] as const).map((t) => {
          const active = effectiveType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onTypeChange(t)}
              className={cn(
                "px-2.5 text-xs font-medium rounded-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "percent" ? "%" : "Flat"}
            </button>
          );
        })}
      </div>
      <Input
        type="number"
        min={0}
        step={0.01}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          if (e.target.value && type === null) onTypeChange(effectiveType);
        }}
        placeholder="0"
        className="h-7 w-32 text-xs"
      />
    </div>
  );
}

interface ChildInfantDiscountProps {
  childType: TourDiscountType | null;
  childValue: string;
  infantType: TourDiscountType | null;
  infantValue: string;
  ageBands?: TourAgePolicyBand[];
  onChange: (v: {
    childType: TourDiscountType | null;
    childValue: string;
    infantType: TourDiscountType | null;
    infantValue: string;
  }) => void;
}

function findBand(
  bands: TourAgePolicyBand[] | undefined,
  name: string,
): TourAgePolicyBand | undefined {
  if (!bands) return undefined;
  const target = name.toLowerCase();
  return bands.find((b) => b.band_name.trim().toLowerCase() === target);
}

function bandLabel(name: string, b: TourAgePolicyBand | undefined) {
  if (!b) return name;
  return `${name} (${b.age_from}–${b.age_to})`;
}

export function ChildInfantDiscountSection({
  childType,
  childValue,
  infantType,
  infantValue,
  ageBands,
  onChange,
}: ChildInfantDiscountProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Discounts
      </p>
      <div className="space-y-2">
        <DiscountRow
          label={bandLabel("Child", findBand(ageBands, "Child"))}
          type={childType}
          value={childValue}
          onTypeChange={(t) =>
            onChange({ childType: t, childValue, infantType, infantValue })
          }
          onValueChange={(v) =>
            onChange({ childType, childValue: v, infantType, infantValue })
          }
        />
        <DiscountRow
          label={bandLabel("Infant", findBand(ageBands, "Infant"))}
          type={infantType}
          value={infantValue}
          onTypeChange={(t) =>
            onChange({ childType, childValue, infantType: t, infantValue })
          }
          onValueChange={(v) =>
            onChange({ childType, childValue, infantType, infantValue: v })
          }
        />
      </div>
    </div>
  );
}

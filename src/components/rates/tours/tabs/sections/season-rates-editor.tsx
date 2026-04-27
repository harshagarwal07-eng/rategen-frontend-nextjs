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
import AddVehicleDialog, {
  type CreatedVehicle,
} from "@/components/rates/transfers/tabs/sections/add-vehicle-dialog";
import EditVehiclesDialog, {
  type VehicleType as MasterVehicleType,
} from "@/components/rates/transfers/tabs/sections/edit-vehicles-dialog";

// ─── Vehicle types cache (module-singleton, shared across rows) ────────

type VehicleType = MasterVehicleType;

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

function useVehicleTypes(): {
  types: VehicleType[];
  upsert: (v: VehicleType) => void;
  replaceAll: (v: VehicleType[]) => void;
} {
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
  const upsert = useCallback((v: VehicleType) => {
    const base = vehicleTypesCache ?? [];
    const idx = base.findIndex((x) => x.id === v.id);
    publish(idx >= 0 ? base.map((x) => (x.id === v.id ? v : x)) : [...base, v]);
  }, []);
  const replaceAll = useCallback((next: VehicleType[]) => {
    publish(next);
  }, []);
  return { types, upsert, replaceAll };
}

// ─── Helpers ───────────────────────────────────────────────────────────

function num(v: number | null | undefined): string {
  if (v == null) return "";
  return v === 0 ? "" : String(v);
}
function parseNum(s: string): number {
  return parseFloat(s) || 0;
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

// ─── Vehicle rates — 6-field row, only Rate is editable ────────────────
// Per spec: Vehicle Type, Brand, Rate, Max Pax, Max Pax w/Luggage, Max
// Luggage. Five non-Rate fields are looked up from the vehicle_types
// master at render time, so master edits show up on next reload of any
// season referencing the row. We store ONLY vehicle_type_id and rate on
// the rate row; the remaining nullable backend columns
// (max_pax_with_luggage, max_kms_day, max_hrs_day, supplement_*) are
// written as null.

export type VehicleRow = {
  _key: string;
  vehicle_type_id: string;
  rate: string;
};

export function vehicleRatesToRows(rates: TourVehicleRate[]): VehicleRow[] {
  return rates.map((r, i) => ({
    _key: r.id ?? `vr-${i}-${Math.random()}`,
    vehicle_type_id: r.vehicle_type_id,
    rate: num(r.rate),
  }));
}

export function rowsToVehicleRates(rows: VehicleRow[]): TourVehicleRate[] {
  return rows
    .filter((r) => r.vehicle_type_id)
    .map((r) => ({
      vehicle_type_id: r.vehicle_type_id,
      rate: parseNum(r.rate),
      max_pax: null,
      max_pax_with_luggage: null,
      max_luggage: null,
      max_kms_day: null,
      max_hrs_day: null,
      supplement_hr: null,
      supplement_km: null,
    }));
}

interface VehicleRatesSectionProps {
  rows: VehicleRow[];
  onRowsChange: (rows: VehicleRow[]) => void;
}

// Sentinel values for the "+ Add" / "Edit list" rows in the dropdown.
const ADD_SENTINEL = "__add__";
const EDIT_SENTINEL = "__edit__";

export function VehicleRatesSection({
  rows,
  onRowsChange,
}: VehicleRatesSectionProps) {
  const { types: vehicleTypes, upsert, replaceAll } = useVehicleTypes();
  const [addDialogFor, setAddDialogFor] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function addRow() {
    onRowsChange([
      ...rows,
      {
        _key: `vr-new-${Date.now()}-${Math.random()}`,
        vehicle_type_id: "",
        rate: "",
      },
    ]);
  }

  function deleteRow(key: string) {
    onRowsChange(rows.filter((r) => r._key !== key));
  }

  function pickVehicle(key: string, vehicleTypeId: string) {
    onRowsChange(
      rows.map((r) =>
        r._key === key ? { ...r, vehicle_type_id: vehicleTypeId } : r,
      ),
    );
  }

  function updateRate(key: string, value: string) {
    onRowsChange(
      rows.map((r) => (r._key === key ? { ...r, rate: value } : r)),
    );
  }

  function handleVehicleCreated(rowKey: string, created: CreatedVehicle) {
    upsert(created);
    pickVehicle(rowKey, created.id);
    setAddDialogFor(null);
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
          rows.map((row) => {
            const vt = vehicleTypes.find((v) => v.id === row.vehicle_type_id);
            const trigger = vt
              ? vt.brand
                ? `${vt.brand} — ${vt.label}`
                : vt.label
              : "Select vehicle…";
            return (
              <div key={row._key} className="rounded-md border p-2">
                <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_80px_64px_64px_64px_28px] gap-2 items-end">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Vehicle Type
                    </label>
                    <Select
                      value={row.vehicle_type_id || ""}
                      onValueChange={(v) => {
                        if (v === ADD_SENTINEL) {
                          setAddDialogFor(row._key);
                          return;
                        }
                        if (v === EDIT_SENTINEL) {
                          setEditOpen(true);
                          return;
                        }
                        pickVehicle(row._key, v);
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Select vehicle…">
                          {trigger}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleTypes.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-xs">
                            {v.brand ? `${v.brand} — ${v.label}` : v.label}
                          </SelectItem>
                        ))}
                        <div className="sticky bottom-0 -mx-1 mt-1 border-t bg-popover">
                          <SelectItem
                            value={ADD_SENTINEL}
                            className="text-xs font-medium text-primary focus:text-primary"
                          >
                            + Add new vehicle
                          </SelectItem>
                          <SelectItem
                            value={EDIT_SENTINEL}
                            className="text-xs font-medium text-muted-foreground focus:text-foreground"
                          >
                            Edit master vehicle list
                          </SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Brand
                    </label>
                    <div className="h-7 flex items-center px-2 text-xs text-muted-foreground truncate">
                      {vt?.brand ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </div>
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
                      onChange={(e) => updateRate(row._key, e.target.value)}
                      placeholder="0"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Max Pax
                    </label>
                    <div className="h-7 flex items-center justify-center text-xs text-muted-foreground">
                      {vt?.pax_capacity ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Max w/Lug
                    </label>
                    <div className="h-7 flex items-center justify-center text-xs text-muted-foreground">
                      {vt?.pax_capacity_with_luggage ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Max Lug
                    </label>
                    <div className="h-7 flex items-center justify-center text-xs text-muted-foreground">
                      {vt?.luggage_capacity ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </div>
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
            );
          })
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

      <AddVehicleDialog
        isOpen={addDialogFor !== null}
        onClose={() => setAddDialogFor(null)}
        onCreated={(v) => {
          if (addDialogFor) handleVehicleCreated(addDialogFor, v);
        }}
      />
      <EditVehiclesDialog
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onChanged={(next) => replaceAll(next)}
      />
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

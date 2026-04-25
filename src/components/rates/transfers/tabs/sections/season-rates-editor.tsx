"use client";

import { useEffect, useState } from "react";
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
  SicRate,
  PrivatePerPaxRate,
  VehicleRateRow,
  VehicleRateType,
  DiscountType,
} from "@/types/transfers";

// ─── Vehicle type fetch (cached at module level) ───────────────────────

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

async function loadVehicleTypes(): Promise<VehicleType[]> {
  if (vehicleTypesCache) return vehicleTypesCache;
  if (vehicleTypesPromise) return vehicleTypesPromise;
  vehicleTypesPromise = http.get<VehicleType[]>("/api/geo/vehicle-types").then((res) => {
    if (res && typeof res === "object" && "error" in res && (res as { error?: unknown }).error) {
      vehicleTypesPromise = null;
      throw new Error(String((res as { error: unknown }).error));
    }
    const data = (res as VehicleType[]) ?? [];
    vehicleTypesCache = data;
    vehicleTypesPromise = null;
    return data;
  });
  return vehicleTypesPromise;
}

function useVehicleTypes() {
  const [types, setTypes] = useState<VehicleType[]>(vehicleTypesCache ?? []);
  useEffect(() => {
    let cancelled = false;
    loadVehicleTypes()
      .then((data) => {
        if (!cancelled) setTypes(data);
      })
      .catch(() => {
        // Silent fail; user will see empty select.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return types;
}

// ─── SIC rates ─────────────────────────────────────────────────────────

export type SicRow = {
  adult_rate: string;
  child_rate: string;
  max_pax: string;
  max_luggage: string;
  supplement_hr: string;
  supplement_km: string;
};

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

export function sicRatesToRow(rates: SicRate[]): SicRow {
  const r = rates[0] ?? null;
  return {
    adult_rate: num(r?.adult_rate),
    child_rate: num(r?.child_rate),
    max_pax: num(r?.max_pax),
    max_luggage: num(r?.max_luggage),
    supplement_hr: num(r?.supplement_hr),
    supplement_km: num(r?.supplement_km),
  };
}

export function rowToSicRates(row: SicRow): SicRate[] {
  const hasAny =
    row.adult_rate !== "" ||
    row.child_rate !== "" ||
    row.max_pax !== "" ||
    row.max_luggage !== "" ||
    row.supplement_hr !== "" ||
    row.supplement_km !== "";
  if (!hasAny) return [];
  return [
    {
      adult_rate: parseNum(row.adult_rate),
      child_rate: parseNum(row.child_rate),
      max_pax: parseNullNum(row.max_pax),
      max_luggage: parseNullNum(row.max_luggage),
      supplement_hr: parseNullNum(row.supplement_hr),
      supplement_km: parseNullNum(row.supplement_km),
    },
  ];
}

interface SicRatesSectionProps {
  row: SicRow;
  onChange: (row: SicRow) => void;
}

export function SicRatesSection({ row, onChange }: SicRatesSectionProps) {
  function set<K extends keyof SicRow>(field: K, value: SicRow[K]) {
    onChange({ ...row, [field]: value });
  }
  const F = ({
    label,
    field,
  }: {
    label: string;
    field: keyof SicRow;
  }) => (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
      <Input
        type="number"
        min={0}
        step={0.01}
        value={row[field]}
        onChange={(e) => set(field, e.target.value)}
        placeholder="0"
        className="h-7 w-24 text-xs"
      />
    </div>
  );
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        SIC Rates
      </p>
      <div className="flex items-end gap-3 flex-wrap">
        <F label="Adult Rate" field="adult_rate" />
        <F label="Child Rate" field="child_rate" />
        <F label="Max Pax" field="max_pax" />
        <F label="Max Luggage" field="max_luggage" />
        <F label="Supp / Hr" field="supplement_hr" />
        <F label="Supp / Km" field="supplement_km" />
      </div>
    </div>
  );
}

// ─── Private per-pax rates ─────────────────────────────────────────────

export type PrivateCell = { _key: string; pax_count: number; rate: string };

const MAX_PAX_CELLS = 30;

export function privateRatesToCells(rates: PrivatePerPaxRate[]): PrivateCell[] {
  const seeded = [...rates]
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

export function cellsToPrivateRates(cells: PrivateCell[]): PrivatePerPaxRate[] {
  return cells
    .filter((c) => c.rate !== "")
    .map((c) => ({ pax_count: c.pax_count, rate: parseNum(c.rate) }));
}

interface PrivateRatesSectionProps {
  cells: PrivateCell[];
  onChange: (cells: PrivateCell[]) => void;
}

export function PrivateRatesSection({ cells, onChange }: PrivateRatesSectionProps) {
  function nextPax(): number | null {
    const used = new Set(cells.map((c) => c.pax_count));
    for (let n = 1; n <= MAX_PAX_CELLS; n++) {
      if (!used.has(n)) return n;
    }
    return null;
  }
  function add() {
    const n = nextPax();
    if (n === null) return;
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
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Per-Pax Rates
      </p>
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
                  title={`Remove ${c.pax_count} pax cell`}
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
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vehicle rates ─────────────────────────────────────────────────────

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

export function vehicleRatesToRows(rates: VehicleRateRow[]): VehicleRow[] {
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

export function rowsToVehicleRates(rows: VehicleRow[]): VehicleRateRow[] {
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

const RATE_TYPE_OPTIONS: {
  value: VehicleRateType;
  label: string;
  rateColumn: string;
}[] = [
  { value: "per_vehicle", label: "Per Vehicle", rateColumn: "Per Vehicle Rate" },
  { value: "per_hour", label: "Per Hour", rateColumn: "Per Hour Rate" },
  { value: "per_km", label: "Per Km", rateColumn: "Per Km Rate" },
];

interface VehicleRatesSectionProps {
  rows: VehicleRow[];
  rateType: VehicleRateType | null;
  onRowsChange: (rows: VehicleRow[]) => void;
  onRateTypeChange: (rt: VehicleRateType) => void;
}

export function VehicleRatesSection({
  rows,
  rateType,
  onRowsChange,
  onRateTypeChange,
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
    if (rateType === null) onRateTypeChange("per_vehicle");
  }

  function deleteRow(key: string) {
    onRowsChange(rows.filter((r) => r._key !== key));
  }

  function pickVehicle(key: string, vehicleTypeId: string) {
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
  }

  function updateField(
    key: string,
    field: keyof Omit<VehicleRow, "_key" | "vehicle_type_id" | "label" | "brand">,
    value: string,
  ) {
    onRowsChange(rows.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  }

  const rateColumnLabel = rateType
    ? RATE_TYPE_OPTIONS.find((o) => o.value === rateType)?.rateColumn ?? "Rate"
    : "Rate";

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Vehicle Rates
        </p>
        {rows.length > 0 && (
          <div className="inline-flex rounded-md border bg-muted/40 p-0.5 h-7">
            {RATE_TYPE_OPTIONS.map((opt) => {
              const active = rateType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onRateTypeChange(opt.value)}
                  className={cn(
                    "px-2.5 text-xs font-medium rounded-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2 mb-2">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No vehicles yet. Click "Add Vehicle" to start.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row._key} className="rounded-md border p-2">
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_60px_60px_60px_auto] gap-2 items-end">
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
                        {row.vehicle_type_id
                          ? row.brand
                            ? `${row.brand} — ${row.label}`
                            : row.label
                          : "Select vehicle…"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((vt) => (
                        <SelectItem key={vt.id} value={vt.id} className="text-xs">
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
                    {row.brand ?? <span className="text-muted-foreground/50">—</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    {rateColumnLabel}
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
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Max Pax
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={row.max_pax}
                    onChange={(e) => updateField(row._key, "max_pax", e.target.value)}
                    placeholder="—"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Max w/Lug
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={row.max_pax_with_luggage}
                    onChange={(e) =>
                      updateField(row._key, "max_pax_with_luggage", e.target.value)
                    }
                    placeholder="—"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Max Lug
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={row.max_luggage}
                    onChange={(e) =>
                      updateField(row._key, "max_luggage", e.target.value)
                    }
                    placeholder="—"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex items-center pb-0.5">
                  <button
                    type="button"
                    className="p-1 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteRow(row._key)}
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-[repeat(4,minmax(0,1fr))_auto] gap-2 items-end mt-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Max Hrs/Day
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={row.max_hrs_day}
                    onChange={(e) =>
                      updateField(row._key, "max_hrs_day", e.target.value)
                    }
                    placeholder="—"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Max Kms/Day
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={row.max_kms_day}
                    onChange={(e) =>
                      updateField(row._key, "max_kms_day", e.target.value)
                    }
                    placeholder="—"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Supp / Hr
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={row.supplement_hr}
                    onChange={(e) =>
                      updateField(row._key, "supplement_hr", e.target.value)
                    }
                    placeholder="0"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Supp / Km
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={row.supplement_km}
                    onChange={(e) =>
                      updateField(row._key, "supplement_km", e.target.value)
                    }
                    placeholder="0"
                    className="h-7 text-xs"
                  />
                </div>
                <div />
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

// ─── Child / infant discount ───────────────────────────────────────────

interface DiscountRowProps {
  label: string;
  type: DiscountType | null;
  value: string;
  onTypeChange: (t: DiscountType) => void;
  onValueChange: (v: string) => void;
}

function DiscountRow({ label, type, value, onTypeChange, onValueChange }: DiscountRowProps) {
  const effectiveType: DiscountType = type ?? "percent";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-14">{label}</span>
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
  childType: DiscountType | null;
  childValue: string;
  infantType: DiscountType | null;
  infantValue: string;
  onChange: (v: {
    childType: DiscountType | null;
    childValue: string;
    infantType: DiscountType | null;
    infantValue: string;
  }) => void;
}

export function ChildInfantDiscountSection({
  childType,
  childValue,
  infantType,
  infantValue,
  onChange,
}: ChildInfantDiscountProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Child / Infant Discount{" "}
        <span className="normal-case font-normal text-muted-foreground/70">
          (applied by rate engine)
        </span>
      </p>
      <div className="space-y-2">
        <DiscountRow
          label="Child"
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
          label="Infant"
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

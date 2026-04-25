"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { PackageTax } from "@/types/transfers";

export type TaxRow = {
  _key: string;
  name: string;
  rate: string;
  rate_type: "percentage" | "fixed";
  is_inclusive: boolean;
};

export function taxesToRows(taxes: PackageTax[]): TaxRow[] {
  return taxes.map((t, i) => ({
    _key: t.id ?? `tax-${i}-${Math.random()}`,
    name: t.name,
    rate: String(t.rate),
    rate_type: t.rate_type,
    is_inclusive: t.is_inclusive,
  }));
}

export function rowsToTaxes(rows: TaxRow[]): PackageTax[] {
  return rows.map((r) => ({
    name: r.name.trim(),
    rate: parseFloat(r.rate) || 0,
    rate_type: r.rate_type,
    is_inclusive: r.is_inclusive,
  }));
}

interface TaxesEditorProps {
  rows: TaxRow[];
  onChange: (rows: TaxRow[]) => void;
}

export default function TaxesEditor({ rows, onChange }: TaxesEditorProps) {
  function updateRow<K extends keyof TaxRow>(key: string, field: K, value: TaxRow[K]) {
    onChange(rows.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    onChange([
      ...rows,
      {
        _key: `tax-${Date.now()}-${Math.random()}`,
        name: "",
        rate: "0",
        rate_type: "percentage",
        is_inclusive: false,
      },
    ]);
  }

  function deleteRow(key: string) {
    onChange(rows.filter((r) => r._key !== key));
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Taxes
          </p>
          <p className="text-[11px] text-muted-foreground/80 mt-0.5">
            Per-package taxes applied on top of rates.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border-2 border-dashed border-border py-5 text-center mb-3">
          <p className="text-xs text-muted-foreground">No taxes defined.</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            Click "Add Tax" to start.
          </p>
        </div>
      ) : (
        <div className="mb-3 rounded-md border overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_140px_160px_32px] gap-x-3 items-center bg-muted/40 border-b px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Name
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Rate
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Type
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Applicability
            </span>
            <span />
          </div>
          <div className="divide-y">
            {rows.map((row) => (
              <div key={row._key} className="px-3 py-2">
                <div className="grid grid-cols-[1fr_100px_140px_160px_32px] gap-x-3 items-center">
                  <Input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(row._key, "name", e.target.value)}
                    placeholder="e.g. VAT"
                    className="h-7 text-xs"
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={row.rate}
                    onChange={(e) => updateRow(row._key, "rate", e.target.value)}
                    placeholder="0"
                    className="h-7 text-xs"
                  />
                  <Select
                    value={row.rate_type}
                    onValueChange={(v) =>
                      updateRow(row._key, "rate_type", v as "percentage" | "fixed")
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage" className="text-xs">
                        Percentage (%)
                      </SelectItem>
                      <SelectItem value="fixed" className="text-xs">
                        Fixed (amount)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={row.is_inclusive}
                      onCheckedChange={(v) => updateRow(row._key, "is_inclusive", v)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {row.is_inclusive ? "Inclusive" : "Exclusive"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex items-center justify-center text-muted-foreground hover:text-destructive"
                    onClick={() => deleteRow(row._key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={addRow}
      >
        <Plus className="h-3 w-3" /> Add Tax
      </Button>
    </div>
  );
}

"use client";

// PAX-tier table for an add-on's "Total Rate" pricing.
// Rows: Min PAX / Max PAX / Flat Rate. The parent owns persistence via
// `replaceAddonTotalRates(addonId, tiers)`. The local row keeps numeric
// strings until commit so empty inputs render correctly.

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { TourAddonTotalRateTier } from "@/types/tours";

export type AddonTotalRateRow = {
  _key: string;
  id?: string;
  min_pax: string;
  max_pax: string;
  rate: string;
};

export function tiersToRows(
  tiers: TourAddonTotalRateTier[],
): AddonTotalRateRow[] {
  return tiers.map((t, i) => ({
    _key: t.id ?? `tier-${i}-${Math.random()}`,
    id: t.id,
    min_pax: String(t.min_pax),
    max_pax: String(t.max_pax),
    rate: String(t.rate),
  }));
}

export function rowsToTiers(
  rows: AddonTotalRateRow[],
): TourAddonTotalRateTier[] {
  return rows
    .filter(
      (r) =>
        r.min_pax !== "" &&
        r.max_pax !== "" &&
        r.rate !== "" &&
        !isNaN(Number(r.min_pax)) &&
        !isNaN(Number(r.max_pax)) &&
        !isNaN(Number(r.rate)),
    )
    .map((r) => ({
      min_pax: Number(r.min_pax),
      max_pax: Number(r.max_pax),
      rate: Number(r.rate),
    }));
}

interface AddonTotalRateSectionProps {
  rows: AddonTotalRateRow[];
  onChange: (next: AddonTotalRateRow[]) => void;
}

export default function AddonTotalRateSection({
  rows,
  onChange,
}: AddonTotalRateSectionProps) {
  function updateRow(key: string, patch: Partial<AddonTotalRateRow>) {
    onChange(rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    onChange([
      ...rows,
      {
        _key: `new-${Date.now()}-${Math.random()}`,
        min_pax: "",
        max_pax: "",
        rate: "",
      },
    ]);
  }

  function deleteRow(key: string) {
    onChange(rows.filter((r) => r._key !== key));
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        Total Rate
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        Flat rate by participant count. Leave blank if you only use
        per-age-band pricing.
      </p>
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-28 text-center">Min PAX</TableHead>
            <TableHead className="w-28 text-center">Max PAX</TableHead>
            <TableHead className="w-32">Flat Rate</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-4 text-center text-xs text-muted-foreground"
              >
                No tiers defined. Click &quot;Add Tier&quot; to add one.
              </TableCell>
            </TableRow>
          )}
          {rows.map((row, idx) => (
            <TableRow
              key={row._key}
              className={idx % 2 === 1 ? "bg-muted/30" : ""}
            >
              <TableCell className="py-1.5 px-2">
                <Input
                  type="number"
                  min={1}
                  value={row.min_pax}
                  onChange={(e) =>
                    updateRow(row._key, { min_pax: e.target.value })
                  }
                  placeholder="1"
                  className="h-7 text-center text-xs"
                />
              </TableCell>
              <TableCell className="py-1.5 px-2">
                <Input
                  type="number"
                  min={1}
                  value={row.max_pax}
                  onChange={(e) =>
                    updateRow(row._key, { max_pax: e.target.value })
                  }
                  placeholder="∞"
                  className="h-7 text-center text-xs"
                />
              </TableCell>
              <TableCell className="py-1.5 px-2">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={row.rate}
                  onChange={(e) =>
                    updateRow(row._key, { rate: e.target.value })
                  }
                  placeholder="0"
                  className="h-7 text-xs"
                />
              </TableCell>
              <TableCell className="py-1.5 pl-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteRow(row._key)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={addRow}
        >
          <Plus className="h-3 w-3" /> Add Tier
        </Button>
      </div>
    </div>
  );
}

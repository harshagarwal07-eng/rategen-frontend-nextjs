"use client";

// Lightweight multi-period date editor used by Supplements and Offers.
// Each row is two native date inputs + a remove button, with an "Add period"
// link at the bottom. Mirrors the visual style of SupplementCard's
// DateRangeSection in old_frontend, ported to ShadCN primitives.

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface DateRangeBlockRow {
  _localId: string;
  date_from: string;
  date_to: string;
}

interface Props {
  label: string;
  helpText?: string;
  rows: DateRangeBlockRow[];
  onChange: (rows: DateRangeBlockRow[]) => void;
  disabled?: boolean;
  newId: () => string;
}

export function DateRangeBlock({
  label,
  helpText,
  rows,
  onChange,
  disabled,
  newId,
}: Props) {
  function update(index: number, patch: Partial<DateRangeBlockRow>) {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function add() {
    onChange([...rows, { _localId: newId(), date_from: "", date_to: "" }]);
  }

  function remove(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {helpText && (
          <p className="mt-0.5 text-[10px] text-muted-foreground/80">
            {helpText}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={r._localId} className="flex items-center gap-2">
            <Input
              type="date"
              value={r.date_from}
              disabled={disabled}
              onChange={(e) => update(i, { date_from: e.target.value })}
              className="h-8 w-44 text-sm"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              type="date"
              value={r.date_to}
              disabled={disabled}
              onChange={(e) => update(i, { date_to: e.target.value })}
              className="h-8 w-44 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => remove(i)}
              disabled={disabled}
              aria-label={`Remove ${label} period`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-[11px] italic text-muted-foreground">
            No periods set — click &ldquo;Add period&rdquo; to define one.
          </p>
        )}
      </div>
      <button
        type="button"
        className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={add}
        disabled={disabled}
      >
        <Plus className="h-3 w-3" /> Add period
      </button>
    </div>
  );
}

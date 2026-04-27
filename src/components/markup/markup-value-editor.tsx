"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type {
  MarkupPer,
  MarkupValue,
  MarkupValueType,
  PaxBreakdown,
} from "@/types/markup";

type Props = {
  value: MarkupValue;
  onChange: (next: MarkupValue) => void;
  /** Show the per dropdown for flat values. Default true. */
  showPer?: boolean;
  /** Show the pax-breakdown toggle. Default true. */
  showPaxBreakdown?: boolean;
  /** Compact layout (one row, no labels). For tables. */
  compact?: boolean;
  /** Disable inputs. */
  disabled?: boolean;
  className?: string;
};

const PER_OPTIONS: MarkupPer[] = ["pax", "night", "unit", "total"];

export function MarkupValueEditor({
  value,
  onChange,
  showPer = true,
  showPaxBreakdown = true,
  compact = false,
  disabled = false,
  className,
}: Props) {
  const [paxOpen, setPaxOpen] = useState(!!value.pax_breakdown);

  const setType = (t: MarkupValueType) => onChange({ ...value, type: t });
  const setValue = (v: number) => onChange({ ...value, value: v });
  const setPer = (p: MarkupPer | undefined) => onChange({ ...value, per: p });
  const togglePax = (enabled: boolean) => {
    setPaxOpen(enabled);
    if (enabled) {
      onChange({
        ...value,
        pax_breakdown: value.pax_breakdown ?? { adult: 0, child: 0, infant: 0 },
      });
    } else {
      const { pax_breakdown: _drop, ...rest } = value;
      void _drop;
      onChange(rest);
    }
  };
  const setBreakdown = (next: PaxBreakdown) => onChange({ ...value, pax_breakdown: next });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className={cn("flex flex-wrap items-end gap-2", compact && "flex-nowrap")}>
        <div className="flex flex-col gap-1">
          {!compact && <Label className="text-xs text-muted-foreground">Type</Label>}
          <div className="inline-flex h-8 rounded-md border bg-background">
            <Button
              type="button"
              size="sm"
              variant={value.type === "pct" ? "default" : "ghost"}
              className="h-8 px-3 rounded-r-none rounded-l-md"
              onClick={() => setType("pct")}
              disabled={disabled}
            >
              %
            </Button>
            <Button
              type="button"
              size="sm"
              variant={value.type === "flat" ? "default" : "ghost"}
              className="h-8 px-3 rounded-l-none rounded-r-md border-l"
              onClick={() => setType("flat")}
              disabled={disabled}
            >
              $
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {!compact && <Label className="text-xs text-muted-foreground">Value</Label>}
          <Input
            type="number"
            step="0.01"
            value={Number.isFinite(value.value) ? value.value : 0}
            onChange={(e) => setValue(Number.parseFloat(e.target.value) || 0)}
            disabled={disabled || !!value.pax_breakdown}
            className={cn("h-8 w-24", compact && "w-20")}
          />
        </div>

        {showPer && value.type === "flat" && (
          <div className="flex flex-col gap-1">
            {!compact && <Label className="text-xs text-muted-foreground">Per</Label>}
            <Select
              value={value.per ?? "pax"}
              onValueChange={(v) => setPer(v as MarkupPer)}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PER_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showPaxBreakdown && !compact && (
          <div className="flex items-center gap-2 ml-2">
            <Switch
              checked={paxOpen}
              onCheckedChange={togglePax}
              disabled={disabled}
              id={`pax-toggle-${Math.random().toString(36).slice(2, 7)}`}
            />
            <Label className="text-xs text-muted-foreground">Per pax type</Label>
          </div>
        )}
      </div>

      {showPaxBreakdown && paxOpen && value.pax_breakdown && (
        <div className="grid grid-cols-3 gap-2 pl-2 border-l-2 border-muted">
          {(["adult", "child", "infant"] as const).map((k) => (
            <div key={k} className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground capitalize">{k}</Label>
              <Input
                type="number"
                step="0.01"
                value={value.pax_breakdown![k]}
                onChange={(e) =>
                  setBreakdown({
                    ...value.pax_breakdown!,
                    [k]: Number.parseFloat(e.target.value) || 0,
                  })
                }
                disabled={disabled}
                className="h-8"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

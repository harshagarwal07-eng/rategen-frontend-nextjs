"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Copy, Check } from "lucide-react";
import { OperationalHour } from "@/types/transfers";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

export type HourRow = {
  day_of_week: number;
  is_active: boolean;
  start_time: string | null;
  end_time: string | null;
};

interface OperationalHoursSectionProps {
  value: HourRow[];
  onChange: (next: HourRow[]) => void;
}

export function defaultOpHours(initialHours?: OperationalHour[]): HourRow[] {
  if (!initialHours || initialHours.length === 0) {
    return DAYS.map((d) => ({
      day_of_week: d.value,
      is_active: true,
      start_time: null,
      end_time: null,
    }));
  }
  const map = new Map(initialHours.map((h) => [h.day_of_week, h]));
  return DAYS.map((d) => {
    const h = map.get(d.value);
    return {
      day_of_week: d.value,
      is_active: h?.is_active ?? true,
      start_time: h?.start_time ?? null,
      end_time: h?.end_time ?? null,
    };
  });
}

function getContextLabel(
  day: string,
  active: boolean,
  startTime: string | null,
  endTime: string | null
): string {
  if (!active) return `Closed on ${day}`;
  if (!startTime && !endTime) return `Available 24x7 on ${day}`;
  return `Standard hours on ${day}`;
}

export default function OperationalHoursSection({
  value,
  onChange,
}: OperationalHoursSectionProps) {
  const updateRow = (day: number, patch: Partial<HourRow>) => {
    onChange(value.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)));
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Operational Hours</h4>
      <div className="rounded-md border overflow-x-auto">
        <div className="grid grid-cols-[120px_70px_110px_110px_36px_1fr] gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[600px]">
          <span>Day</span>
          <span>Active</span>
          <span>Start</span>
          <span>End</span>
          <span></span>
          <span></span>
        </div>
        {DAYS.map((d) => {
          const row = value.find((r) => r.day_of_week === d.value);
          if (!row) return null;
          const ctx = getContextLabel(d.label, row.is_active, row.start_time, row.end_time);
          return (
            <div
              key={d.value}
              className="grid grid-cols-[120px_70px_110px_110px_36px_1fr] items-center gap-2 px-3 py-1.5 border-b last:border-b-0 min-w-[600px]"
            >
              <span className="text-sm">{d.label}</span>
              <Switch
                checked={row.is_active}
                onCheckedChange={(v) => updateRow(d.value, { is_active: v })}
              />
              <Input
                type="time"
                className="h-8 text-xs"
                disabled={!row.is_active}
                value={row.start_time ?? ""}
                onChange={(e) =>
                  updateRow(d.value, { start_time: e.target.value || null })
                }
              />
              <Input
                type="time"
                className="h-8 text-xs"
                disabled={!row.is_active}
                value={row.end_time ?? ""}
                onChange={(e) =>
                  updateRow(d.value, { end_time: e.target.value || null })
                }
              />
              <CopyDayButton
                sourceDay={d.value}
                rows={value}
                onApply={(targetDays, src) => {
                  onChange(
                    value.map((r) =>
                      targetDays.includes(r.day_of_week)
                        ? {
                            ...r,
                            is_active: src.is_active,
                            start_time: src.start_time,
                            end_time: src.end_time,
                          }
                        : r
                    )
                  );
                }}
              />
              <span className="text-xs text-muted-foreground pl-2">{ctx}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CopyDayButtonProps {
  sourceDay: number;
  rows: HourRow[];
  onApply: (targetDays: number[], src: HourRow) => void;
}

function CopyDayButton({ sourceDay, rows, onApply }: CopyDayButtonProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const src = rows.find((r) => r.day_of_week === sourceDay);
  const otherDays = DAYS.filter((d) => d.value !== sourceDay);

  const toggle = (day: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const apply = (toAll: boolean) => {
    if (!src) return;
    const targets = toAll ? otherDays.map((d) => d.value) : Array.from(selected);
    if (targets.length === 0) return;
    onApply(targets, src);
    setSelected(new Set());
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSelected(new Set());
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Copy this day's timing to other days"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="text-xs font-semibold px-1 py-1">Copy timing to…</div>
        <div className="flex flex-col gap-0.5">
          {otherDays.map((d) => {
            const checked = selected.has(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggle(d.value)}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-left"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    checked ? "bg-primary border-primary text-primary-foreground" : "border-input"
                  }`}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                {d.label}
              </button>
            );
          })}
        </div>
        <div className="border-t mt-2 pt-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => apply(true)}
          >
            All days
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs"
            onClick={() => apply(false)}
            disabled={selected.size === 0}
          >
            Apply ({selected.size})
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

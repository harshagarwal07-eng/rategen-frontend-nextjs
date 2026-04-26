"use client";

// Operational hours editor — supports BOTH Range and Slots modes.
// `day_of_week` is an integer 1..7 (ISO: 1 = Monday, 7 = Sunday) — matches
// the backend `tour_operational_hours.day_of_week` column. On save the
// parent flattens slots[]=[] in Range mode and start_time/end_time=null
// in Slots mode.

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2, X, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { TourOperationalHour } from "@/types/tours";

const DAYS = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 7, short: "Sun", long: "Sunday" },
] as const;

export type HoursMode = "range" | "slots";

export type OpHourRow = {
  day_of_week: number;
  is_active: boolean;
  start_time: string;
  end_time: string;
  slots: string[];
};

export function defaultOpHourRows(
  initial?: TourOperationalHour[],
): { rows: OpHourRow[]; mode: HoursMode } {
  const rows: OpHourRow[] = DAYS.map((d) => ({
    day_of_week: d.value,
    is_active: false,
    start_time: "",
    end_time: "",
    slots: [],
  }));

  let inferSlots = false;
  if (initial && initial.length > 0) {
    for (const h of initial) {
      const idx = DAYS.findIndex((d) => d.value === h.day_of_week);
      if (idx >= 0) {
        const slots = Array.isArray(h.slots) ? h.slots : [];
        if (slots.length > 0) inferSlots = true;
        rows[idx] = {
          day_of_week: h.day_of_week,
          is_active: !!h.is_active,
          start_time: h.start_time ?? "",
          end_time: h.end_time ?? "",
          slots,
        };
      }
    }
  }
  return { rows, mode: inferSlots ? "slots" : "range" };
}

export function rowsToTourOpHours(
  rows: OpHourRow[],
  mode: HoursMode,
): TourOperationalHour[] {
  return rows.map((r) => ({
    day_of_week: r.day_of_week,
    is_active: r.is_active,
    start_time: r.is_active && mode === "range" ? r.start_time || null : null,
    end_time: r.is_active && mode === "range" ? r.end_time || null : null,
    slots: r.is_active && mode === "slots" ? r.slots : null,
  }));
}

interface OperationalHoursSectionProps {
  rows: OpHourRow[];
  mode: HoursMode;
  onRowsChange: (rows: OpHourRow[]) => void;
  onModeChange: (mode: HoursMode) => void;
}

export default function OperationalHoursSection({
  rows,
  mode,
  onRowsChange,
  onModeChange,
}: OperationalHoursSectionProps) {
  function update(idx: number, patch: Partial<OpHourRow>) {
    onRowsChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addSlot(idx: number, time: string) {
    if (!time) return;
    const cur = rows[idx].slots;
    if (cur.includes(time)) return;
    update(idx, { slots: [...cur, time].sort() });
  }

  function removeSlot(idx: number, slot: string) {
    update(idx, { slots: rows[idx].slots.filter((s) => s !== slot) });
  }

  function copyRowTo(sourceIdx: number, targetDays: number[]) {
    const src = rows[sourceIdx];
    onRowsChange(
      rows.map((r) =>
        targetDays.includes(r.day_of_week)
          ? {
              ...r,
              is_active: src.is_active,
              start_time: src.start_time,
              end_time: src.end_time,
              slots: [...src.slots],
            }
          : r,
      ),
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Operational Hours
        </h4>
        <div className="inline-flex rounded-md border bg-muted/40 p-0.5 h-7">
          <button
            type="button"
            className={cn(
              "px-3 text-xs font-medium rounded-sm transition-colors",
              mode === "range"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onModeChange("range")}
          >
            Range
          </button>
          <button
            type="button"
            className={cn(
              "px-3 text-xs font-medium rounded-sm transition-colors",
              mode === "slots"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onModeChange("slots")}
          >
            Slots
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {rows.map((row, idx) => {
          const dayInfo = DAYS.find((d) => d.value === row.day_of_week);
          if (!dayInfo) return null;
          return (
            <div
              key={row.day_of_week}
              className={cn(
                "rounded-md border px-3 py-2 flex items-center gap-2",
                row.is_active ? "bg-background" : "bg-muted/30",
              )}
            >
              <Switch
                checked={row.is_active}
                onCheckedChange={(v) => update(idx, { is_active: v })}
              />
              <span
                className={cn(
                  "text-xs font-medium w-10 shrink-0",
                  row.is_active ? "" : "text-muted-foreground",
                )}
              >
                {dayInfo.short}
              </span>

              {row.is_active ? (
                mode === "range" ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      className="h-8 w-28 text-xs"
                      value={row.start_time}
                      onChange={(e) =>
                        update(idx, { start_time: e.target.value })
                      }
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      className="h-8 w-28 text-xs"
                      value={row.end_time}
                      onChange={(e) =>
                        update(idx, { end_time: e.target.value })
                      }
                    />
                    {!row.start_time && !row.end_time && (
                      <span className="text-xs text-muted-foreground italic">
                        Pick start &amp; end
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap flex-1">
                    {row.slots.length === 0 && (
                      <span className="text-xs text-muted-foreground italic mr-1">
                        Add available slots →
                      </span>
                    )}
                    {row.slots.map((slot) => (
                      <Badge
                        key={slot}
                        variant="outline"
                        className="gap-1 text-xs h-7"
                      >
                        {slot}
                        <button
                          type="button"
                          onClick={() => removeSlot(idx, slot)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <Input
                      type="time"
                      className="h-7 w-24 text-xs"
                      onBlur={(e) => {
                        if (e.target.value) {
                          addSlot(idx, e.target.value);
                          e.target.value = "";
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = (e.target as HTMLInputElement).value;
                          if (v) {
                            addSlot(idx, v);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                  </div>
                )
              ) : (
                <span className="text-xs text-muted-foreground flex-1">
                  Tour doesn&apos;t operate on this day
                </span>
              )}

              <CopyDayButton
                sourceDay={row.day_of_week}
                onApply={(targetDays) => copyRowTo(idx, targetDays)}
                disabled={!row.is_active && rows.every((r) => !r.is_active)}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() =>
                  update(idx, {
                    is_active: false,
                    start_time: "",
                    end_time: "",
                    slots: [],
                  })
                }
                title="Clear row"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CopyDayButtonProps {
  sourceDay: number;
  onApply: (targetDays: number[]) => void;
  disabled?: boolean;
}

function CopyDayButton({ sourceDay, onApply, disabled }: CopyDayButtonProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
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
    const targets = toAll ? otherDays.map((d) => d.value) : Array.from(selected);
    if (targets.length === 0) return;
    onApply(targets);
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
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Copy this day to other days"
          disabled={disabled}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="text-xs font-semibold px-1 py-1">Copy to…</div>
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
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    checked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                {d.long}
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

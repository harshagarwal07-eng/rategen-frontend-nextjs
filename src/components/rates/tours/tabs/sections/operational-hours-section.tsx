"use client";

// Operational hours editor — supports BOTH Range and Slots modes.
// Forked from transfers' operational-hours-section because:
//   1. transfers stores `day_of_week` as a number (1..7) but tours
//      backend stores it as a string ("Monday" | "Tuesday" | …).
//   2. tours support time slots (per old_frontend OperationalHoursEditor).
// On save the parent flattens slots[]=[] in Range mode and start_time/
// end_time=null in Slots mode.

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TourOperationalHour } from "@/types/tours";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

export type HoursMode = "range" | "slots";

export type OpHourRow = {
  day_of_week: (typeof DAYS)[number];
  is_active: boolean;
  start_time: string;
  end_time: string;
  slots: string[];
};

export function defaultOpHourRows(
  initial?: TourOperationalHour[],
): { rows: OpHourRow[]; mode: HoursMode } {
  const rows: OpHourRow[] = DAYS.map((d) => ({
    day_of_week: d,
    is_active: false,
    start_time: "",
    end_time: "",
    slots: [],
  }));

  let inferSlots = false;
  if (initial && initial.length > 0) {
    for (const h of initial) {
      const idx = DAYS.indexOf(h.day_of_week as (typeof DAYS)[number]);
      if (idx >= 0) {
        const slots = Array.isArray(h.slots) ? h.slots : [];
        if (slots.length > 0) inferSlots = true;
        rows[idx] = {
          day_of_week: h.day_of_week as (typeof DAYS)[number],
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
        {rows.map((row, idx) => (
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
              {DAY_LABELS[row.day_of_week]}
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
                    onChange={(e) => update(idx, { end_time: e.target.value })}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
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
                Not active
              </span>
            )}

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
        ))}
      </div>
    </div>
  );
}

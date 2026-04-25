"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DepartureCalendarCell } from "./departure-calendar-cell";
import type { FDDeparture } from "@/types/fixed-departures";

const WEEK_OPTS = { weekStartsOn: 1 } as const;
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Props {
  departures: FDDeparture[];
  onCreateAt: (iso: string) => void;
  onEditDeparture: (d: FDDeparture) => void;
}

export function DepartureCalendar({ departures, onCreateAt, onEditDeparture }: Props) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<Date>(today);

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), WEEK_OPTS);
    const end = endOfWeek(endOfMonth(cursor), WEEK_OPTS);
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const departuresByDate = useMemo(() => {
    const map = new Map<string, FDDeparture[]>();
    for (const d of departures) {
      if (!d.departure_date) continue;
      const list = map.get(d.departure_date) ?? [];
      list.push(d);
      map.set(d.departure_date, list);
    }
    return map;
  }, [departures]);

  const yearOptions = useMemo(() => {
    const baseYear = cursor.getFullYear();
    const minYear = Math.min(baseYear - 3, today.getFullYear() - 3);
    const maxYear = Math.max(baseYear + 5, today.getFullYear() + 5);
    const out: number[] = [];
    for (let y = minYear; y <= maxYear; y++) out.push(y);
    return out;
  }, [cursor, today]);

  const todayIso = isoDate(today);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="text-base font-semibold ml-1">
            {format(cursor, "MMMM yyyy")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCursor(today)}
          >
            Today
          </Button>
          <Select
            value={String(cursor.getFullYear())}
            onValueChange={(v) =>
              setCursor((c) => new Date(Number(v), c.getMonth(), 1))
            }
          >
            <SelectTrigger className="h-9 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {WEEKDAY_LABELS.map((l) => (
          <div key={l} className="px-1.5 py-1">{l}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((date) => {
          const iso = isoDate(date);
          const cellDepartures = departuresByDate.get(iso) ?? [];
          return (
            <DepartureCalendarCell
              key={iso}
              date={date}
              iso={iso}
              inMonth={isSameMonth(date, cursor)}
              isToday={isSameDay(date, today)}
              isPast={iso < todayIso}
              departures={cellDepartures}
              onCreateAt={onCreateAt}
              onEditDeparture={onEditDeparture}
            />
          );
        })}
      </div>
    </div>
  );
}

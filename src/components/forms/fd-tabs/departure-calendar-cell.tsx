"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FDDeparture } from "@/types/fixed-departures";

const PILL_CLASS: Record<string, string> = {
  planned: "bg-muted text-muted-foreground border-muted-foreground/20",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200 line-through",
};

function pillClass(status: string | null | undefined): string {
  if (!status) return PILL_CLASS.planned;
  return PILL_CLASS[status] ?? PILL_CLASS.planned;
}

function seatsLabel(d: FDDeparture): string {
  if (d.availability_status === "sold_out") return "Sold out";
  const total = d.total_seats ?? 0;
  const sold = d.seats_sold ?? 0;
  const hold = d.seats_on_hold ?? 0;
  const left = Math.max(0, total - sold - hold);
  if (total === 0) return "—";
  return `${left} left`;
}

interface Props {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  departures: FDDeparture[];
  onCreateAt: (iso: string) => void;
  onEditDeparture: (d: FDDeparture) => void;
}

export function DepartureCalendarCell({
  date,
  iso,
  inMonth,
  isToday,
  isPast,
  departures,
  onCreateAt,
  onEditDeparture,
}: Props) {
  const visiblePills = departures.slice(0, 2);
  const overflow = departures.length - visiblePills.length;

  const handleCellClick = () => {
    if (departures.length === 0) onCreateAt(iso);
  };

  return (
    <div
      className={cn(
        "relative min-h-[88px] rounded border p-1.5 flex flex-col gap-1 transition-colors",
        inMonth ? "bg-background" : "bg-muted/40 text-muted-foreground",
        isPast && "opacity-60",
        departures.length === 0 && "cursor-pointer hover:bg-accent/40",
      )}
      onClick={handleCellClick}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            isToday &&
              "rounded-full bg-primary text-primary-foreground px-1.5 py-0.5",
          )}
        >
          {format(date, "d")}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {visiblePills.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditDeparture(d);
            }}
            className={cn(
              "rounded border px-1.5 py-0.5 text-[10px] text-left truncate",
              pillClass(d.departure_status),
            )}
            title={`${d.departure_status ?? "planned"} · ${seatsLabel(d)}`}
          >
            {seatsLabel(d)}
          </button>
        ))}

        {overflow > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
              >
                +{overflow} more
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start" onClick={(e) => e.stopPropagation()}>
              <div className="text-xs font-medium mb-1.5 text-muted-foreground">
                {departures.length} departures on {format(date, "MMM d")}
              </div>
              <div className="flex flex-col gap-1">
                {departures.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onEditDeparture(d)}
                    className={cn(
                      "rounded border px-2 py-1 text-xs text-left",
                      pillClass(d.departure_status),
                    )}
                  >
                    <span className="capitalize">{d.departure_status ?? "planned"}</span>
                    <span className="text-muted-foreground"> · {seatsLabel(d)}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

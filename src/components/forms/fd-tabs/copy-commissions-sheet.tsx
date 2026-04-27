"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface CommissionCopyTarget {
  id: string;
  departure_date: string;
  departure_status: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: CommissionCopyTarget[];
  onApply: (selectedIds: string[]) => Promise<void>;
}

const STATUS_BADGE_VARIANT: Record<string, string> = {
  planned: "bg-muted text-muted-foreground border-muted-foreground/20",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

function statusClass(status: string | null): string {
  if (!status) return STATUS_BADGE_VARIANT.planned;
  return STATUS_BADGE_VARIANT[status] ?? STATUS_BADGE_VARIANT.planned;
}

export function CopyCommissionsSheet({ open, onOpenChange, targets, onApply }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // Reset selection whenever the sheet opens.
  useEffect(() => {
    if (open) {
      setSelected(new Set());
    }
  }, [open]);

  const sorted = useMemo(
    () => [...targets].sort((a, b) => a.departure_date.localeCompare(b.departure_date)),
    [targets],
  );

  const allSelected = sorted.length > 0 && sorted.every((t) => selected.has(t.id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(sorted.map((t) => t.id)));
  const clearAll = () => setSelected(new Set());

  const handleApply = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await onApply(Array.from(selected));
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        onOpenChange(o);
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 gap-0 flex flex-col"
        onInteractOutside={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <SheetHeader className="border-b">
          <SheetTitle>Copy commission to other departures</SheetTitle>
        </SheetHeader>

        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b text-xs">
          <span className="text-muted-foreground">
            {selected.size} of {sorted.length} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-primary hover:underline disabled:opacity-50"
              onClick={selectAll}
              disabled={allSelected || busy}
            >
              Select all
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:underline disabled:opacity-50"
              onClick={clearAll}
              disabled={selected.size === 0 || busy}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground italic">
              No other departures to copy to.
            </div>
          ) : (
            <ul className="divide-y">
              {sorted.map((t) => {
                const checked = selected.has(t.id);
                const dateStr = t.departure_date
                  ? format(parseISO(t.departure_date), "MMM d, yyyy")
                  : "(no date)";
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => toggle(t.id)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-accent/50 transition-colors",
                        checked && "bg-accent/30",
                      )}
                      disabled={busy}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggle(t.id)} />
                      <span className="text-sm font-medium flex-1">{dateStr}</span>
                      <Badge variant="outline" className={statusClass(t.departure_status)}>
                        {t.departure_status ?? "planned"}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <SheetFooter className="border-t flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={busy || selected.size === 0}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying…
              </>
            ) : (
              `Apply to ${selected.size} departure${selected.size === 1 ? "" : "s"}`
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

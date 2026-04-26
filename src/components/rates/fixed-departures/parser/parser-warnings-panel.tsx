"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GeoWarningRecord } from "@/lib/fd-parser-errors";

const FIELD_COLORS: Record<string, string> = {
  country: "bg-blue-100 text-blue-800 border-blue-200",
  city: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export function ParserWarningsPanel({
  warnings,
}: {
  warnings: GeoWarningRecord[];
}) {
  if (warnings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No save-time warnings.</p>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div>
          <p className="font-medium">
            Save produced {warnings.length} warning
            {warnings.length === 1 ? "" : "s"}.
          </p>
          <p className="mt-0.5 text-amber-800">
            Countries and cities not found in the geo registry were
            auto-created and flagged for review. The parse still saved; these
            entries are visible in the package and may need editing.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {warnings.map((w, i) => (
          <li key={i} className="rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  FIELD_COLORS[w.field] ??
                    "border-gray-200 bg-gray-100 text-gray-700",
                )}
              >
                {w.field}
              </Badge>
              <span className="text-sm font-medium">{w.value}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {w.message}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

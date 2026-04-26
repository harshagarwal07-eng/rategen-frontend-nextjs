"use client";

// Sales-mode pill bar. Mirrors old_frontend SALES_MODES list.
// `ticket` is disabled for `day_trip` and `multi_day` per legacy
// `isSalesModeAllowed`.

import { cn } from "@/lib/utils";
import {
  TourPackageCategory,
  TourPackageSalesMode,
} from "@/types/tours";

const SALES_MODES: {
  value: TourPackageSalesMode;
  label: string;
}[] = [
  { value: "ticket", label: "Ticket" },
  { value: "shared", label: "Shared" },
  { value: "private", label: "Private" },
  { value: "exclusive", label: "Exclusive" },
];

export function isSalesModeAllowed(
  mode: TourPackageSalesMode,
  category: TourPackageCategory,
): boolean {
  if ((category === "day_trip" || category === "multi_day") && mode === "ticket")
    return false;
  return true;
}

interface PackageSalesModeToggleProps {
  value: TourPackageSalesMode;
  onChange: (next: TourPackageSalesMode) => void;
  category: TourPackageCategory;
  className?: string;
}

export default function PackageSalesModeToggle({
  value,
  onChange,
  category,
  className,
}: PackageSalesModeToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border bg-muted/40 p-0.5 h-9 w-fit",
        className,
      )}
    >
      {SALES_MODES.map((opt) => {
        const allowed = isSalesModeAllowed(opt.value, category);
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={!allowed}
            onClick={() => allowed && onChange(opt.value)}
            className={cn(
              "px-3 text-xs font-medium rounded-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              !allowed && "opacity-30 cursor-not-allowed",
            )}
            title={
              !allowed
                ? "Ticket sales mode does not apply to day-trip or multi-day packages."
                : undefined
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

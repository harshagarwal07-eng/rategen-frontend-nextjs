"use client";

// Per-package category pill bar.
// Investigation note: in old_frontend the toggle lives inside
// `PackageCardBody.tsx`'s "Section 0 — Category" — i.e. PER-PACKAGE.
// New TourPackageDetail mirrors that with `category` on the row.

import { cn } from "@/lib/utils";
import { TourPackageCategory } from "@/types/tours";

const CATEGORY_OPTIONS: { value: TourPackageCategory; label: string }[] = [
  { value: "attraction", label: "Attraction" },
  { value: "activity", label: "Activity" },
  { value: "combo", label: "Combo" },
  { value: "day_trip", label: "Day Trip" },
  { value: "multi_day", label: "Multi-Day" },
];

interface PackageCategoryToggleProps {
  value: TourPackageCategory;
  onChange: (next: TourPackageCategory) => void;
  className?: string;
}

export default function PackageCategoryToggle({
  value,
  onChange,
  className,
}: PackageCategoryToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border bg-muted/40 p-0.5 h-9 w-fit",
        className,
      )}
    >
      {CATEGORY_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 text-xs font-medium rounded-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

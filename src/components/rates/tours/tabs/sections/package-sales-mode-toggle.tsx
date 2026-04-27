"use client";

// Sales-mode pill bar. Available modes depend on package category.
//   attraction / combo  → ticket, shared, private, exclusive
//   day_trip / multi_day → shared, private, exclusive (no ticket)
// Only allowed modes are rendered (not just disabled).

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

export function getAllowedSalesModes(
  category: TourPackageCategory,
): TourPackageSalesMode[] {
  if (category === "day_trip" || category === "multi_day") {
    return ["shared", "private", "exclusive"];
  }
  return ["ticket", "shared", "private", "exclusive"];
}

export function isSalesModeAllowed(
  mode: TourPackageSalesMode,
  category: TourPackageCategory,
): boolean {
  return getAllowedSalesModes(category).includes(mode);
}

// New packages default to `private` if the category allows it (every
// category does today), with `shared` as a structural fallback.
export function defaultSalesModeFor(
  category: TourPackageCategory,
): TourPackageSalesMode {
  const allowed = getAllowedSalesModes(category);
  return allowed.includes("private") ? "private" : allowed[0];
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
  const allowed = getAllowedSalesModes(category);
  return (
    <div
      className={cn(
        "inline-flex rounded-md border bg-muted/40 p-0.5 h-9 w-fit",
        className,
      )}
    >
      {SALES_MODES.filter((o) => allowed.includes(o.value)).map((opt) => {
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

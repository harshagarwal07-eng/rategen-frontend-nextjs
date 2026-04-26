"use client";

import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { FDPublicPackage } from "@/types/fd-search";

interface PackageInclusionsProps {
  pkg: FDPublicPackage;
}

const CATEGORIES: Array<{ key: string; label: string; incField: keyof FDPublicPackage; excField: keyof FDPublicPackage }> = [
  { key: "hotels", label: "Hotels", incField: "inc_hotels", excField: "exc_hotels" },
  { key: "meals", label: "Meals", incField: "inc_meals", excField: "exc_meals" },
  { key: "guide", label: "Guide", incField: "inc_guide", excField: "exc_guide" },
  { key: "tours", label: "Tours & sightseeing", incField: "inc_tours", excField: "exc_tours" },
  { key: "transfers", label: "Transfers", incField: "inc_transfers", excField: "exc_transfers" },
  { key: "taxes", label: "Taxes", incField: "inc_taxes", excField: "exc_taxes" },
  { key: "other", label: "Other", incField: "inc_other", excField: "exc_other" },
];

function lines(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((s) => s.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function hasContent(value: unknown): boolean {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return false;
}

export function PackageInclusions({ pkg }: PackageInclusionsProps) {
  const visibleCategories = CATEGORIES.filter((cat) => {
    return hasContent(pkg[cat.incField]) || hasContent(pkg[cat.excField]);
  });

  if (visibleCategories.length === 0) return null;

  return (
    <section id="inclusions" className="space-y-4 scroll-mt-24">
      <h2 className="text-xl font-semibold">Inclusions & Exclusions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleCategories.map((cat) => {
          const incs = lines(pkg[cat.incField] as string[] | string | null);
          const excs = lines(pkg[cat.excField] as string[] | string | null);
          return (
            <Card key={cat.key} className="p-4 border-border/60 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold">{cat.label}</h3>
              {incs.length > 0 && (
                <ul className="space-y-1.5">
                  {incs.map((line, i) => (
                    <li key={`inc-${i}`} className="flex items-start gap-2 text-xs">
                      <Check className="size-3.5 text-success shrink-0 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
              {excs.length > 0 && (
                <ul className="space-y-1.5">
                  {excs.map((line, i) => (
                    <li key={`exc-${i}`} className="flex items-start gap-2 text-xs">
                      <X className="size-3.5 text-destructive shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

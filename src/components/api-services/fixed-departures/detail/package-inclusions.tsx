"use client";

import { useState } from "react";
import {
  Building2,
  Car,
  Check,
  ChevronDown,
  ListChecks,
  MapPin,
  MoreHorizontal,
  Receipt,
  User,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { FDPublicPackage } from "@/types/fd-search";

interface PackageInclusionsProps {
  pkg: FDPublicPackage;
}

const CATEGORIES: Array<{
  key: string;
  label: string;
  icon: LucideIcon;
  incField: keyof FDPublicPackage;
  excField: keyof FDPublicPackage;
}> = [
  { key: "hotels", label: "Hotels", icon: Building2, incField: "inc_hotels", excField: "exc_hotels" },
  { key: "tours", label: "Tours & sightseeing", icon: MapPin, incField: "inc_tours", excField: "exc_tours" },
  { key: "transfers", label: "Transfers", icon: Car, incField: "inc_transfers", excField: "exc_transfers" },
  { key: "meals", label: "Meals", icon: UtensilsCrossed, incField: "inc_meals", excField: "exc_meals" },
  { key: "guide", label: "Guide", icon: User, incField: "inc_guide", excField: "exc_guide" },
  { key: "taxes", label: "Taxes", icon: Receipt, incField: "inc_taxes", excField: "exc_taxes" },
  { key: "other", label: "Other", icon: MoreHorizontal, incField: "inc_other", excField: "exc_other" },
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

export function PackageInclusions({ pkg }: PackageInclusionsProps) {
  const visibleCategories = CATEGORIES.filter((cat) => {
    const inc = lines(pkg[cat.incField] as string[] | string | null);
    const exc = lines(pkg[cat.excField] as string[] | string | null);
    return inc.length > 0 || exc.length > 0;
  });

  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () => new Set(visibleCategories.slice(0, 2).map((c) => c.key)),
  );

  if (visibleCategories.length === 0) return null;

  const toggle = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allOpen = visibleCategories.every((c) => openKeys.has(c.key));

  const expandAll = () =>
    setOpenKeys(allOpen ? new Set() : new Set(visibleCategories.map((c) => c.key)));

  return (
    <section id="inclusions" className="space-y-4 scroll-mt-32">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ListChecks className="size-4 text-success" />
          Inclusions & Exclusions
        </h2>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          onClick={expandAll}
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="space-y-2">
        {visibleCategories.map((cat) => {
          const inc = lines(pkg[cat.incField] as string[] | string | null);
          const exc = lines(pkg[cat.excField] as string[] | string | null);
          const open = openKeys.has(cat.key);
          const Icon = cat.icon;
          return (
            <Card key={cat.key} className="border-border/60 shadow-sm overflow-hidden p-0">
              <Collapsible open={open} onOpenChange={() => toggle(cat.key)}>
                <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors text-left">
                  <Icon className="size-4 text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{cat.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {inc.length > 0 && `${inc.length} included`}
                      {inc.length > 0 && exc.length > 0 && " · "}
                      {exc.length > 0 && `${exc.length} excluded`}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground shrink-0 transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                      {inc.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-success">
                            Included
                          </div>
                          <ul className="space-y-1.5">
                            {inc.map((line, i) => (
                              <li key={`inc-${i}`} className="flex items-start gap-2 text-sm">
                                <Check className="size-3.5 text-success shrink-0 mt-0.5" />
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {exc.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
                            Excluded
                          </div>
                          <ul className="space-y-1.5">
                            {exc.map((line, i) => (
                              <li key={`exc-${i}`} className="flex items-start gap-2 text-sm">
                                <X className="size-3.5 text-destructive shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

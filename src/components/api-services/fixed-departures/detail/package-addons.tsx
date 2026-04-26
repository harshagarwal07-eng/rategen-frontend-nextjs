"use client";

import { Sparkles, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FDPublicAddon } from "@/types/fd-search";

interface PackageAddonsProps {
  addons: FDPublicAddon[];
  currency: string | null;
}

function formatPrice(amount: number | null, currency: string | null): string | null {
  if (amount == null) return null;
  const code = currency || "INR";
  if (code === "INR") return `₹${amount.toLocaleString("en-IN")}`;
  return `${code} ${amount.toLocaleString()}`;
}

export function PackageAddons({ addons, currency }: PackageAddonsProps) {
  if (addons.length === 0) return null;

  return (
    <section id="addons" className="space-y-4 scroll-mt-32">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Plus className="size-4 text-primary" />
        Add-ons
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {addons.map((addon) => (
          <Card key={addon.id} className="p-4 border-border/60 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{addon.name}</h3>
                  {addon.is_mandatory && (
                    <Badge variant="destructive" className="text-[10px]">
                      Mandatory
                    </Badge>
                  )}
                </div>
                {addon.addon_type && (
                  <Badge variant="secondary" className="font-normal text-xs">
                    {addon.addon_type}
                  </Badge>
                )}
              </div>
              {addon.price_adult != null && (
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-muted-foreground">From</div>
                  <div className="text-sm font-bold">
                    {formatPrice(addon.price_adult, currency)}
                  </div>
                  {addon.price_unit && (
                    <div className="text-[10px] text-muted-foreground">{addon.price_unit}</div>
                  )}
                </div>
              )}
            </div>
            {addon.description && (
              <p className="text-xs text-muted-foreground">{addon.description}</p>
            )}
            {addon.duration_days != null && addon.duration_days > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="size-3" />
                <span>{addon.duration_days} day add-on</span>
              </div>
            )}
            {addon.fd_addon_itinerary_days.length > 0 && (
              <div className="pt-2 border-t border-border/60 space-y-1.5">
                {addon.fd_addon_itinerary_days
                  .sort((a, b) => a.day_number - b.day_number)
                  .map((day) => (
                    <div key={day.id} className="text-xs">
                      <span className="font-medium">Day {day.day_number}:</span>{" "}
                      <span className="text-muted-foreground">{day.title || "—"}</span>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

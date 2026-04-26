"use client";

import { ChevronDown, Calendar, Users, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FDPublicDeparture, FDPublicPackage } from "@/types/fd-search";
import { BookViaWhatsAppButton } from "../booking/book-via-whatsapp-button";

interface DeparturesSidebarProps {
  pkg: FDPublicPackage;
  departures: FDPublicDeparture[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(amount: number | null, currency: string | null): string | null {
  if (amount == null) return null;
  const code = currency || "INR";
  if (code === "INR") return `₹${amount.toLocaleString("en-IN")}`;
  return `${code} ${amount.toLocaleString()}`;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-success/15 text-success border-success/30",
  planned: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const RATE_TIERS: Array<{
  key:
    | "rate_single"
    | "rate_double"
    | "rate_triple"
    | "rate_teen"
    | "rate_child_no_bed"
    | "rate_child_extra_bed"
    | "rate_infant";
  label: string;
}> = [
  { key: "rate_single", label: "Single" },
  { key: "rate_double", label: "Double (per pax)" },
  { key: "rate_triple", label: "Triple (per pax)" },
  { key: "rate_teen", label: "Teen" },
  { key: "rate_child_extra_bed", label: "Child (extra bed)" },
  { key: "rate_child_no_bed", label: "Child (no bed)" },
  { key: "rate_infant", label: "Infant" },
];

export function DeparturesSidebar({ pkg, departures, selectedId, onSelect }: DeparturesSidebarProps) {
  if (departures.length === 0) {
    return (
      <Card className="p-4 border-border/60 shadow-sm">
        <p className="text-sm text-muted-foreground text-center py-6">
          No upcoming departures available
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden p-0">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="size-4 text-primary" />
          Select your departure
        </h3>
      </div>

      <div className="divide-y divide-border/60 max-h-[60vh] overflow-y-auto">
        {departures.map((dep) => {
          const isSelected = dep.id === selectedId;
          const fromPrice = dep.fd_departure_pricing.find((p) => p.rate_double != null)?.rate_double;
          return (
            <div key={dep.id}>
              <button
                type="button"
                onClick={() => onSelect(dep.id)}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-start gap-3",
                  isSelected && "bg-primary/5",
                )}
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{formatDate(dep.departure_date)}</span>
                    {dep.is_guaranteed && (
                      <Badge className="bg-success text-success-foreground text-[10px] gap-1 border-0">
                        <Sparkles className="size-2.5" />
                        Guaranteed
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] capitalize",
                        STATUS_STYLES[dep.departure_status] || "",
                      )}
                    >
                      {dep.departure_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="size-3" />
                      <span>{dep.seats_available} seats left</span>
                    </div>
                    {fromPrice != null && (
                      <div className="font-medium text-foreground">
                        From {formatPrice(fromPrice, pkg.currency)}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground shrink-0 transition-transform mt-1",
                    isSelected && "rotate-180",
                  )}
                />
              </button>

              {isSelected && (
                <div className="px-4 py-3 bg-muted/30 border-t border-border/60 space-y-3">
                  {dep.fd_departure_pricing.length === 0 && (
                    <p className="text-xs text-muted-foreground">No pricing configured</p>
                  )}
                  {dep.fd_departure_pricing.map((pricing) => (
                    <div key={pricing.id} className="space-y-1.5">
                      {pricing.pricing_type !== "land_only" && (
                        <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                          {pricing.pricing_type.replace(/_/g, " ")}
                        </div>
                      )}
                      <div className="space-y-1">
                        {RATE_TIERS.map((tier) => {
                          const value = pricing[tier.key];
                          if (value == null) return null;
                          return (
                            <div key={tier.key} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{tier.label}</span>
                              <span className="font-medium">
                                {formatPrice(value, pkg.currency)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="pt-2">
                    <BookViaWhatsAppButton
                      packageName={pkg.name}
                      tourCode={pkg.tour_code}
                      departureDate={dep.departure_date}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronDown, MapPin, Utensils, Hotel, ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { FDPublicItineraryDay } from "@/types/fd-search";

interface PackageItineraryProps {
  days: FDPublicItineraryDay[];
}

const MEAL_LABEL: Record<string, string> = { B: "Breakfast", L: "Lunch", D: "Dinner" };

function parseMeals(meals: string[] | string | null | undefined): string[] {
  if (!meals) return [];
  if (Array.isArray(meals)) return meals.map((m) => m.trim().toUpperCase()).filter(Boolean);
  if (typeof meals === "string") {
    return meals
      .split(/[,\s]+/)
      .map((m) => m.trim().toUpperCase())
      .filter(Boolean);
  }
  return [];
}

export function PackageItinerary({ days }: PackageItineraryProps) {
  if (days.length === 0) return null;

  const sorted = [...days].sort((a, b) => a.day_number - b.day_number);

  return (
    <section id="itinerary" className="space-y-4 scroll-mt-32">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <MapPin className="size-4 text-primary" />
        Itinerary
      </h2>
      <div className="space-y-2">
        {sorted.map((day) => (
          <DayCard key={day.id} day={day} />
        ))}
      </div>
    </section>
  );
}

function DayCard({ day }: { day: FDPublicItineraryDay }) {
  const [open, setOpen] = useState(day.day_number === 1);
  const meals = parseMeals(day.meals_included);

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden p-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors text-left">
          <div className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
            {day.day_number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{day.title || `Day ${day.day_number}`}</div>
            {day.overnight_city && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                <span>Overnight in {day.overnight_city}</span>
              </div>
            )}
          </div>
          <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 space-y-3 border-t bg-muted/20">
            {day.image_url && (
              <div className="relative w-full h-48 rounded-md overflow-hidden bg-muted">
                <Image
                  src={day.image_url}
                  alt={day.title || `Day ${day.day_number}`}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
            )}
            {day.description && (
              <div
                className="text-sm text-muted-foreground prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: day.description }}
              />
            )}
            {day.includes && (
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Includes</div>
                <div
                  className="text-sm prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: day.includes }}
                />
              </div>
            )}
            {meals.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Utensils className="size-3.5 text-muted-foreground" />
                {meals.map((m) => (
                  <Badge key={m} variant="secondary" className="font-normal text-xs">
                    {MEAL_LABEL[m] || m}
                  </Badge>
                ))}
              </div>
            )}
            {day.accommodation_note && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Hotel className="size-3.5 shrink-0 mt-0.5" />
                <span>{day.accommodation_note}</span>
              </div>
            )}
            {!day.image_url && !day.description && !day.includes && meals.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ImageIcon className="size-3.5" />
                <span>No details available for this day</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceCardV2, type ServiceCardV2Data } from "./service-card-v2";
import { cn } from "@/lib/utils";

// =====================================================
// DAY ACTIVITIES CAROUSEL
// Horizontal scrollable cards for day-wise itinerary
// =====================================================

interface DayActivitiesCarouselProps {
  activities: ServiceCardV2Data[];
  showPricing?: boolean;
  currency?: string;
  className?: string;
}

export function DayActivitiesCarousel({
  activities,
  showPricing = true,
  currency = "USD",
  className,
}: DayActivitiesCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!activities || activities.length === 0) return null;

  // Apply global settings
  const processedActivities = activities.map((a) => ({
    ...a,
    showPricing,
    currency: a.currency || currency,
  }));

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 220; // Card width + gap
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("relative group", className)}>
      {/* Scroll buttons */}
      {activities.length > 2 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "bg-background/90 shadow-lg border-0",
              "-translate-x-4"
            )}
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "bg-background/90 shadow-lg border-0",
              "translate-x-4"
            )}
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Cards container */}
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-3 overflow-x-auto scrollbar-hide pb-2",
          "snap-x snap-mandatory scroll-smooth",
          // Hide scrollbar
          "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        )}
      >
        {processedActivities.map((activity, index) => (
          <div key={activity.id || `${activity.type}-${index}`} className="snap-start">
            <ServiceCardV2 data={activity} size="default" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default DayActivitiesCarousel;

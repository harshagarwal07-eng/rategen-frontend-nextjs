"use client";

import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import type { ItineraryDay, ItineraryOutput } from "./types";
import { EmptyState, splitList } from "./shared";

const MEAL_COLORS: Record<string, string> = {
  Breakfast: "bg-amber-50 text-amber-700 border-amber-200",
  Lunch: "bg-orange-50 text-orange-700 border-orange-200",
  Dinner: "bg-purple-50 text-purple-700 border-purple-200",
};

export function ItineraryRenderer({ data }: { data: ItineraryOutput }) {
  const days = data.days ?? [];
  const countries = data.countries ?? [];
  const cities = data.cities ?? [];
  const departureCity = data.departure_city ?? null;
  const departureCountry = data.departure_city_country ?? null;
  const description = data.description ?? null;

  if (
    days.length === 0 &&
    countries.length === 0 &&
    cities.length === 0 &&
    !departureCity &&
    !description
  ) {
    return <EmptyState>No itinerary extracted.</EmptyState>;
  }

  const useCollapsed = days.length > 5;

  return (
    <div className="space-y-4">
      {(countries.length > 0 || cities.length > 0 || departureCity) && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          {countries.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Countries
              </span>
              {countries.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className="border-blue-200 bg-blue-100 text-[10px] text-blue-700"
                >
                  {c}
                </Badge>
              ))}
            </div>
          )}
          {cities.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Cities
              </span>
              {cities.map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px]">
                  {c}
                </Badge>
              ))}
            </div>
          )}
          {departureCity && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Departure city
              </span>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-100 text-[10px] text-emerald-700"
              >
                {departureCity}
                {departureCountry ? `, ${departureCountry}` : ""}
              </Badge>
            </div>
          )}
        </div>
      )}

      {description && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{description}</ReactMarkdown>
        </div>
      )}

      {days.length === 0 ? (
        <EmptyState>No itinerary days extracted.</EmptyState>
      ) : (
        <div className="space-y-2">
          {days.map((d, i) => (
            <DayCard
              key={`${d.day_number ?? i}-${i}`}
              day={d}
              defaultOpen={!useCollapsed || i < 3}
              collapsible={useCollapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DayCard({
  day,
  defaultOpen,
  collapsible,
}: {
  day: ItineraryDay;
  defaultOpen: boolean;
  collapsible: boolean;
}) {
  const meals = splitList(day.meals_included);
  const headerTitle = `Day ${day.day_number ?? "?"}${day.title ? ` — ${day.title}` : ""}`;

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold">{headerTitle}</span>
      {day.overnight_city && (
        <Badge variant="secondary" className="text-[10px]">
          Overnight · {day.overnight_city}
        </Badge>
      )}
      {meals.map((m) => (
        <Badge
          key={m}
          variant="outline"
          className={`${
            MEAL_COLORS[m] ?? "border-gray-200 bg-gray-50 text-gray-600"
          } text-[10px]`}
        >
          {m}
        </Badge>
      ))}
    </div>
  );

  const body = (
    <div className="mt-2 space-y-2 text-sm">
      {day.description && (
        <p className="leading-relaxed text-foreground/90">{day.description}</p>
      )}
      {day.includes && (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Includes
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {day.includes}
          </p>
        </div>
      )}
      {day.accommodation_note && (
        <div className="rounded border border-dashed bg-muted/40 px-2 py-1.5">
          <p className="mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Accommodation
          </p>
          <p className="text-xs">{day.accommodation_note}</p>
        </div>
      )}
    </div>
  );

  if (!collapsible) {
    return (
      <div className="rounded-lg border bg-card p-3">
        {header}
        {body}
      </div>
    );
  }

  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border bg-card open:bg-card"
    >
      <summary className="flex list-none cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
        {header}
        <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="border-t px-3 py-2">{body}</div>
    </details>
  );
}

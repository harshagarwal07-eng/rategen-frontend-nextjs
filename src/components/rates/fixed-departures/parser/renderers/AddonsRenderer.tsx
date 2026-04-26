"use client";

import { Badge } from "@/components/ui/badge";
import type { Addon, AddonsOutput } from "./types";
import { EmptyState, fmtNumber, splitList } from "./shared";

const TYPE_COLORS: Record<string, string> = {
  day_tour: "bg-blue-100 text-blue-700 border-blue-200",
  transfer: "bg-purple-100 text-purple-700 border-purple-200",
  meal: "bg-amber-100 text-amber-700 border-amber-200",
  experience: "bg-pink-100 text-pink-700 border-pink-200",
  extension: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export function AddonsRenderer({ data }: { data: AddonsOutput }) {
  const addons = data.addons ?? [];
  if (addons.length === 0) return <EmptyState>No add-ons extracted.</EmptyState>;

  return (
    <div className="space-y-3">
      {addons.map((a, i) => (
        <AddonCard key={i} addon={a} />
      ))}
    </div>
  );
}

function AddonCard({ addon }: { addon: Addon }) {
  const priceUnit = addon.price_unit
    ? addon.price_unit.replace(/_/g, " ")
    : null;
  const typeColor = addon.addon_type
    ? (TYPE_COLORS[addon.addon_type] ?? "bg-gray-100 text-gray-700 border-gray-200")
    : null;
  const hasAnyPrice = [
    addon.price_adult,
    addon.price_child,
    addon.price_teen,
    addon.price_infant,
  ].some((v) => typeof v === "number" && Number.isFinite(v));
  const incItems = splitList(addon.inclusions);
  const excItems = splitList(addon.exclusions);
  const hasPricingVariations =
    Array.isArray(addon.departure_pricing) && addon.departure_pricing.length > 0;
  const hasMiniItinerary =
    Array.isArray(addon.itinerary_days) && addon.itinerary_days.length > 0;

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">
              {addon.name ?? "(unnamed)"}
            </h3>
            {addon.addon_type && (
              <Badge variant="outline" className={`${typeColor} text-[10px]`}>
                {addon.addon_type.replace(/_/g, " ")}
              </Badge>
            )}
            {addon.is_mandatory && (
              <Badge
                variant="outline"
                className="border-red-200 bg-red-100 text-[10px] text-red-700"
              >
                Mandatory
              </Badge>
            )}
            {typeof addon.duration_days === "number" &&
              addon.duration_days > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {addon.duration_days}d
                </Badge>
              )}
          </div>
          {addon.description && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {addon.description}
            </p>
          )}
        </div>
      </div>

      {addon.price_on_request ? (
        <div className="rounded border border-dashed border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
          Price on request{priceUnit ? ` · ${priceUnit}` : ""}
        </div>
      ) : hasAnyPrice ? (
        <div className="grid grid-cols-4 gap-1.5">
          <PriceCell label="Adult" v={addon.price_adult} />
          <PriceCell label="Child" v={addon.price_child} />
          <PriceCell label="Teen" v={addon.price_teen} />
          <PriceCell label="Infant" v={addon.price_infant} />
          {priceUnit && (
            <div className="col-span-4 text-[10px] text-muted-foreground">
              per {priceUnit.replace(/^per /, "")}
            </div>
          )}
        </div>
      ) : null}

      {(incItems.length > 0 || excItems.length > 0) && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {incItems.length > 0 && (
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-wider text-emerald-700">
                Includes
              </p>
              <ul className="space-y-0.5">
                {incItems.map((x, i) => (
                  <li key={i} className="text-[11px] text-foreground/90">
                    • {x}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {excItems.length > 0 && (
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-wider text-rose-700">
                Excludes
              </p>
              <ul className="space-y-0.5">
                {excItems.map((x, i) => (
                  <li key={i} className="text-[11px] text-foreground/90">
                    • {x}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {(hasMiniItinerary || hasPricingVariations) && (
        <details className="rounded border bg-muted/30">
          <summary className="cursor-pointer list-none px-2 py-1.5 text-[11px] text-muted-foreground [&::-webkit-details-marker]:hidden">
            Details (
            {hasMiniItinerary
              ? `${addon.itinerary_days?.length ?? 0} itinerary day(s)`
              : ""}
            {hasMiniItinerary && hasPricingVariations ? ", " : ""}
            {hasPricingVariations
              ? `${addon.departure_pricing?.length ?? 0} pricing variations`
              : ""}
            )
          </summary>
          <pre className="max-h-60 overflow-auto border-t bg-card px-2 py-1 font-mono text-[10px] text-muted-foreground">
            {JSON.stringify(
              {
                itinerary_days: addon.itinerary_days,
                departure_pricing: addon.departure_pricing,
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}
    </div>
  );
}

function PriceCell({
  label,
  v,
}: {
  label: string;
  v: number | null | undefined;
}) {
  const has = typeof v === "number" && Number.isFinite(v);
  return (
    <div
      className={`rounded px-2 py-1 text-center ${
        has ? "border bg-card" : "border border-dashed bg-muted/40"
      }`}
    >
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`font-mono text-xs tabular-nums ${
          has ? "" : "text-muted-foreground"
        }`}
      >
        {fmtNumber(v)}
      </p>
    </div>
  );
}

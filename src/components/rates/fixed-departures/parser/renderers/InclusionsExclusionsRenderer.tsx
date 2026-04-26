"use client";

import { Check, X } from "lucide-react";
import type { InclusionsExclusionsOutput } from "./types";
import { EmptyState, splitList } from "./shared";

const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: "hotels", label: "Hotels" },
  { key: "meals", label: "Meals" },
  { key: "guide", label: "Guide" },
  { key: "tours", label: "Tours & Sightseeing" },
  { key: "transfers", label: "Transfers" },
  { key: "taxes", label: "Taxes" },
  { key: "visa", label: "Visa" },
  { key: "other", label: "Other" },
];

export function InclusionsExclusionsRenderer({
  data,
}: {
  data: InclusionsExclusionsOutput;
}) {
  const incCats = CATEGORIES.map((c) => ({
    ...c,
    items: splitList(
      data[`inc_${c.key}` as keyof InclusionsExclusionsOutput] as
        | string[]
        | null,
    ),
  })).filter((c) => c.items.length > 0);
  const excCats = CATEGORIES.map((c) => ({
    ...c,
    items: splitList(
      data[`exc_${c.key}` as keyof InclusionsExclusionsOutput] as
        | string[]
        | null,
    ),
  })).filter((c) => c.items.length > 0);

  if (incCats.length === 0 && excCats.length === 0) {
    return <EmptyState>No inclusions or exclusions extracted.</EmptyState>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Column
        title="Inclusions"
        icon={<Check className="h-3.5 w-3.5 text-emerald-600" />}
        headerClass="bg-emerald-50 text-emerald-700 border-emerald-200"
        bulletClass="text-emerald-500"
        cats={incCats}
      />
      <Column
        title="Exclusions"
        icon={<X className="h-3.5 w-3.5 text-rose-600" />}
        headerClass="bg-rose-50 text-rose-700 border-rose-200"
        bulletClass="text-rose-400"
        cats={excCats}
      />
    </div>
  );
}

function Column({
  title,
  icon,
  headerClass,
  bulletClass,
  cats,
}: {
  title: string;
  icon: React.ReactNode;
  headerClass: string;
  bulletClass: string;
  cats: Array<{ key: string; label: string; items: string[] }>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div
        className={`flex items-center gap-1.5 border-b px-3 py-1.5 text-xs font-semibold ${headerClass}`}
      >
        {icon}
        {title}
      </div>
      {cats.length === 0 ? (
        <div className="px-3 py-3">
          <p className="text-xs text-muted-foreground">None listed.</p>
        </div>
      ) : (
        <div className="divide-y">
          {cats.map((c) => (
            <div key={c.key} className="px-3 py-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </p>
              <ul className="space-y-0.5">
                {c.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-xs text-foreground/90"
                  >
                    <span className={`mt-[3px] ${bulletClass}`}>•</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

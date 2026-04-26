"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Departure, DeparturesPricingOutput } from "./types";
import { EmptyState, fmtDate, fmtNumber, SectionTitle } from "./shared";

const STATUS_COLORS: Record<string, string> = {
  guaranteed: "bg-green-100 text-green-700 border-green-200",
  planned: "bg-blue-100 text-blue-700 border-blue-200",
  sold_out: "bg-red-100 text-red-700 border-red-200",
  on_request: "bg-amber-100 text-amber-700 border-amber-200",
  available: "bg-green-100 text-green-700 border-green-200",
  waitlist: "bg-orange-100 text-orange-700 border-orange-200",
};

export function DeparturesPricingRenderer({
  data,
}: {
  data: DeparturesPricingOutput;
}) {
  const departures = data.departures ?? [];
  const currency = data.currency ?? null;
  const ageNote = data.age_policy_note ?? null;
  const flags = data.ai_flags ?? [];

  if (
    departures.length === 0 &&
    !currency &&
    !ageNote &&
    flags.length === 0
  ) {
    return <EmptyState>No departures or pricing extracted.</EmptyState>;
  }

  const firstPricing = departures.find((d) => d.pricing)?.pricing ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {currency && (
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-700"
          >
            {currency}
          </Badge>
        )}
        <Badge variant="secondary" className="text-[10px]">
          {departures.length} departures
        </Badge>
        {firstPricing?.pricing_type && (
          <Badge variant="outline" className="text-[10px]">
            {firstPricing.pricing_type.replace(/_/g, " ")}
          </Badge>
        )}
      </div>

      {flags.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            AI flags
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-900">
            {flags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {departures.length > 0 && (
        <div>
          <SectionTitle count={departures.length}>Departure dates</SectionTitle>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departure</TableHead>
                  <TableHead>Return</TableHead>
                  <TableHead>Cutoff</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Min/Max pax</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Double / single</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departures.map((d, i) => (
                  <DepartureRow key={i} d={d} />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {firstPricing && (
        <div>
          <SectionTitle>Price per person (first departure)</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <PriceCard label="Single" value={firstPricing.rate_single} />
            <PriceCard label="Double" value={firstPricing.rate_double} />
            <PriceCard label="Triple" value={firstPricing.rate_triple} />
            <PriceCard
              label="Child + bed"
              value={firstPricing.rate_child_extra_bed}
            />
            <PriceCard
              label="Child no bed"
              value={firstPricing.rate_child_no_bed}
            />
            <PriceCard label="Teen" value={firstPricing.rate_teen} />
            <PriceCard label="Infant" value={firstPricing.rate_infant} />
          </div>
        </div>
      )}

      {ageNote && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
            Age policy note
          </p>
          <p className="text-xs leading-relaxed text-blue-900">{ageNote}</p>
        </div>
      )}
    </div>
  );
}

function DepartureRow({ d }: { d: Departure }) {
  const depStatus = d.departure_status ?? null;
  const availStatus = d.availability_status ?? null;
  const pricing = d.pricing ?? null;
  return (
    <TableRow>
      <TableCell className="font-medium">{fmtDate(d.departure_date)}</TableCell>
      <TableCell className="text-muted-foreground">
        {fmtDate(d.return_date)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {fmtDate(d.cutoff_date)}
      </TableCell>
      <TableCell>{fmtNumber(d.total_seats)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {d.min_pax != null || d.max_pax != null
          ? `${d.min_pax ?? "?"}–${d.max_pax ?? "?"}`
          : "—"}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {depStatus && (
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[10px] ${
                STATUS_COLORS[depStatus] ??
                "border-gray-200 bg-gray-100 text-gray-700"
              }`}
            >
              {depStatus.replace(/_/g, " ")}
            </span>
          )}
          {availStatus && availStatus !== depStatus && (
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[10px] ${
                STATUS_COLORS[availStatus] ??
                "border-gray-200 bg-gray-100 text-gray-700"
              }`}
            >
              {availStatus.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {pricing
          ? `${fmtNumber(pricing.rate_double ?? null)} / ${fmtNumber(
              pricing.rate_single ?? null,
            )}`
          : "—"}
      </TableCell>
    </TableRow>
  );
}

function PriceCard({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const has = typeof value === "number" && Number.isFinite(value);
  return (
    <div
      className={`rounded-md px-2.5 py-2 ${
        has ? "border bg-card" : "border border-dashed bg-muted/40"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`font-mono text-sm tabular-nums ${
          has ? "" : "text-muted-foreground"
        }`}
      >
        {fmtNumber(value)}
      </p>
    </div>
  );
}

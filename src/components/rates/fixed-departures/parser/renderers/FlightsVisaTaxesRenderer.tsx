"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Flight,
  FlightsVisaTaxesOutput,
  Insurance,
  Tax,
  Visa,
} from "./types";
import { EmptyState, fmtNumber, fmtValue, SectionTitle } from "./shared";

export function FlightsVisaTaxesRenderer({
  data,
}: {
  data: FlightsVisaTaxesOutput;
}) {
  const flights = data.flights ?? [];
  const visa = data.visa ?? null;
  const insurance = data.insurance ?? null;
  const taxes = data.taxes ?? [];
  const flightsIncluded = data.flights_included_top_level === true;

  const hasAny =
    flights.length > 0 || visa || insurance || taxes.length > 0;
  if (!hasAny)
    return <EmptyState>No flights, visa, or tax info extracted.</EmptyState>;

  return (
    <div className="space-y-4">
      <FlightsSection flights={flights} flightsIncluded={flightsIncluded} />
      {flights.length > 0 && <Separator />}
      <VisaSection visa={visa} />
      <Separator />
      <InsuranceSection insurance={insurance} />
      <Separator />
      <TaxesSection taxes={taxes} />
    </div>
  );
}

function FlightsSection({
  flights,
  flightsIncluded,
}: {
  flights: Flight[];
  flightsIncluded: boolean;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <SectionTitle count={flights.length}>Flights</SectionTitle>
        <Badge
          variant="outline"
          className={
            flightsIncluded
              ? "border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
              : "border-gray-200 bg-gray-50 text-[10px] text-gray-600"
          }
        >
          {flightsIncluded ? "Included in package" : "Not included"}
        </Badge>
      </div>
      {flights.length === 0 ? (
        <p className="text-xs text-muted-foreground">No flights listed.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Airline</TableHead>
                <TableHead>Dep / Arr</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flights.map((f, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">
                    {f.flight_group ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-medium">
                      {f.origin_city ?? "—"}
                    </span>
                    {f.origin_airport && (
                      <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                        ({f.origin_airport})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-medium">
                      {f.destination_city ?? "—"}
                    </span>
                    {f.destination_airport && (
                      <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                        ({f.destination_airport})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {f.airline ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {f.departure_time || f.arrival_time
                      ? `${f.departure_time ?? "—"} → ${f.arrival_time ?? "—"}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {f.flight_type && (
                        <Badge variant="secondary" className="text-[10px]">
                          {f.flight_type}
                        </Badge>
                      )}
                      {f.is_direct && (
                        <Badge
                          variant="outline"
                          className="border-blue-200 bg-blue-100 text-[10px] text-blue-700"
                        >
                          Direct
                        </Badge>
                      )}
                      {f.price_on_request && (
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-100 text-[10px] text-amber-700"
                        >
                          POR
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function VisaSection({ visa }: { visa: Visa | null }) {
  return (
    <section>
      <SectionTitle>Visa</SectionTitle>
      {!visa ||
      (!visa.visa_type && visa.visa_included == null && !visa.notes) ? (
        <p className="text-xs text-muted-foreground">No visa info listed.</p>
      ) : (
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            {visa.visa_type && (
              <span className="text-sm font-medium">{visa.visa_type}</span>
            )}
            <Badge
              variant="outline"
              className={
                visa.visa_included
                  ? "border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-[10px] text-rose-700"
              }
            >
              {visa.visa_included ? "Included" : "Not included"}
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <PriceCell label="Adult" v={visa.price_adult} />
            <PriceCell label="Child" v={visa.price_child} />
            <PriceCell label="Teen" v={visa.price_teen} />
            <PriceCell label="Infant" v={visa.price_infant} />
          </div>
          {visa.notes && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {visa.notes}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function InsuranceSection({ insurance }: { insurance: Insurance | null }) {
  return (
    <section>
      <SectionTitle>Insurance</SectionTitle>
      {!insurance ||
      (insurance.insurance_included == null && !insurance.insurance_notes) ? (
        <p className="text-xs text-muted-foreground">
          No insurance info listed.
        </p>
      ) : (
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <Badge
            variant="outline"
            className={
              insurance.insurance_included
                ? "border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                : "border-rose-200 bg-rose-50 text-[10px] text-rose-700"
            }
          >
            {insurance.insurance_included ? "Included" : "Not included"}
          </Badge>
          <div className="grid grid-cols-4 gap-1.5">
            <PriceCell label="Adult" v={insurance.insurance_price_adult} />
            <PriceCell label="Child" v={insurance.insurance_price_child} />
            <PriceCell label="Teen" v={insurance.insurance_price_teen} />
            <PriceCell label="Infant" v={insurance.insurance_price_infant} />
          </div>
          {insurance.insurance_notes && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {insurance.insurance_notes}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function TaxesSection({ taxes }: { taxes: Tax[] }) {
  return (
    <section>
      <SectionTitle count={taxes.length}>Taxes</SectionTitle>
      {taxes.length === 0 ? (
        <p className="text-xs text-muted-foreground">No taxes listed.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead>In package</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxes.map((t, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">
                    {t.name ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {fmtValue(t.amount, t.value_type)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.basis?.replace(/_/g, " ") ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        t.included
                          ? "border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                          : "border-gray-200 bg-gray-50 text-[10px] text-gray-600"
                      }
                    >
                      {t.included ? "Included" : "Excluded"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
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

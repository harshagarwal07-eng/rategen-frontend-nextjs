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
import type {
  CancellationRule,
  PaymentScheduleItem,
  PoliciesOutput,
} from "./types";
import { EmptyState, fmtNumber, SectionTitle } from "./shared";

export function PoliciesRenderer({ data }: { data: PoliciesOutput }) {
  const cancellation = data.cancellation_rules ?? [];
  const payment = data.payment_schedule ?? [];
  const refundPolicy = data.refund_policy ?? null;
  const paymentPolicy = data.payment_policy ?? null;
  const tnc = data.terms_and_conditions ?? null;

  const hasAny =
    cancellation.length > 0 ||
    payment.length > 0 ||
    refundPolicy ||
    paymentPolicy ||
    tnc;
  if (!hasAny) return <EmptyState>No policies extracted.</EmptyState>;

  return (
    <div className="space-y-5">
      {cancellation.length > 0 && <CancellationSection rules={cancellation} />}
      {payment.length > 0 && <PaymentScheduleSection items={payment} />}

      {refundPolicy && (
        <section>
          <SectionTitle>Refund policy</SectionTitle>
          <BulletBlock text={refundPolicy} tone="rose" />
        </section>
      )}
      {paymentPolicy && (
        <section>
          <SectionTitle>Payment policy</SectionTitle>
          <BulletBlock text={paymentPolicy} tone="blue" />
        </section>
      )}
      {tnc && (
        <section>
          <SectionTitle>Terms &amp; Conditions</SectionTitle>
          <BulletBlock text={tnc} tone="gray" />
        </section>
      )}
    </div>
  );
}

function CancellationSection({ rules }: { rules: CancellationRule[] }) {
  const sorted = [...rules].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  return (
    <section>
      <SectionTitle count={sorted.length}>Cancellation rules</SectionTitle>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Window</TableHead>
              <TableHead>Basis</TableHead>
              <TableHead>Penalty</TableHead>
              <TableHead>Per-pax</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap text-xs">
                  {rangeLabel(r.days_from, r.days_to)} days
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.date_basis?.replace(/_/g, " ") ?? "departure date"}
                </TableCell>
                <TableCell>
                  {r.value_type === "percentage" ? (
                    <Badge
                      variant="outline"
                      className="border-red-200 bg-red-50 text-[10px] text-red-700"
                    >
                      {fmtNumber(r.penalty_pct)}%
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-red-200 bg-red-50 text-[10px] text-red-700"
                    >
                      {fmtNumber(r.penalty_adult)} fixed
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground">
                  <span className="font-mono">
                    A:{fmtNumber(r.penalty_adult)}
                  </span>{" "}
                  <span className="font-mono">
                    C:{fmtNumber(r.penalty_child)}
                  </span>{" "}
                  <span className="font-mono">
                    I:{fmtNumber(r.penalty_infant)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function PaymentScheduleSection({ items }: { items: PaymentScheduleItem[] }) {
  const sorted = [...items].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  return (
    <section>
      <SectionTitle count={sorted.length}>Payment schedule</SectionTitle>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Milestone</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Basis</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Per-pax</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm font-medium">
                  {p.label ?? "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {rangeLabel(p.days_from, p.days_to)} days
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {p.date_basis?.replace(/_/g, " ") ?? "departure date"}
                </TableCell>
                <TableCell>
                  {p.value_type === "percentage" ? (
                    <Badge
                      variant="outline"
                      className="border-blue-200 bg-blue-50 text-[10px] text-blue-700"
                    >
                      {fmtNumber(p.amount_pct)}%
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-blue-200 bg-blue-50 text-[10px] text-blue-700"
                    >
                      {fmtNumber(p.amount_adult)} fixed
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground">
                  <span className="font-mono">
                    A:{fmtNumber(p.amount_adult)}
                  </span>{" "}
                  <span className="font-mono">
                    C:{fmtNumber(p.amount_child)}
                  </span>{" "}
                  <span className="font-mono">
                    I:{fmtNumber(p.amount_infant)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function BulletBlock({
  text,
  tone,
}: {
  text: string;
  tone: "rose" | "blue" | "gray";
}) {
  const cls =
    tone === "rose"
      ? "border-rose-200 bg-rose-50/40"
      : tone === "blue"
        ? "border-blue-200 bg-blue-50/40"
        : "border bg-muted/40";
  const items = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean);
  return (
    <div className={`rounded-lg border px-3 py-2 ${cls}`}>
      {items.length === 0 ? (
        <p className="whitespace-pre-wrap text-xs leading-relaxed">{text}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((line, i) => (
            <li
              key={i}
              className="flex items-start gap-1.5 text-xs leading-relaxed"
            >
              <span className="mt-[3px] text-muted-foreground">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function rangeLabel(
  from: number | null | undefined,
  to: number | null | undefined,
): string {
  const OPEN = 9999;
  if (from == null && to == null) return "—";
  if (to === OPEN || to == null) return `>${from ?? 0}`;
  if (from === 0 || from == null) return `0–${to}`;
  return `${from}–${to}`;
}

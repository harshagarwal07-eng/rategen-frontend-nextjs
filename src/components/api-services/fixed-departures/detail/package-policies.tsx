"use client";

import { useState } from "react";
import { ChevronDown, ScrollText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type {
  FDPublicCancellationRule,
  FDPublicDateBasis,
  FDPublicDeparture,
  FDPublicPackage,
  FDPublicPaymentScheduleItem,
} from "@/types/fd-search";

interface PackagePoliciesProps {
  pkg: FDPublicPackage;
  selectedDeparture: FDPublicDeparture | null;
}

function rangePhrase(from: number | null, to: number | null): string {
  if (from == null && to == null) return "Any time";
  if (from != null && to == null) return `${from}+ days`;
  if (from == null && to != null) return `0 – ${to} days`;
  return `${from} – ${to} days`;
}

function anchorPhrase(basis: FDPublicDateBasis | null): string {
  return basis === "booking_date" ? "after booking" : "before departure";
}

function whenPhrase(from: number | null, to: number | null, basis: FDPublicDateBasis | null): string {
  return `${rangePhrase(from, to)} ${anchorPhrase(basis)}`;
}

function formatAmount(rule: FDPublicCancellationRule, currency: string): string {
  if (rule.value_type === "fixed") {
    if (rule.penalty_adult == null) return "—";
    return `${currency} ${rule.penalty_adult.toLocaleString()}`;
  }
  if (rule.penalty_pct == null) return "—";
  return `${rule.penalty_pct}%`;
}

function formatPaymentAmount(item: FDPublicPaymentScheduleItem, currency: string): string {
  if (item.value_type === "fixed") {
    if (item.amount_adult == null) return "—";
    return `${currency} ${item.amount_adult.toLocaleString()}`;
  }
  if (item.amount_pct == null) return "—";
  return `${item.amount_pct}%`;
}

function looksLikeHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

export function PackagePolicies({ pkg, selectedDeparture }: PackagePoliciesProps) {
  const cancellationRules = selectedDeparture
    ? [...selectedDeparture.fd_cancellation_policy].sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const paymentSchedule = selectedDeparture
    ? [...selectedDeparture.fd_payment_schedule].sort((a, b) => a.sort_order - b.sort_order)
    : [];

  const currency = pkg.currency || "INR";

  return (
    <section id="policies" className="space-y-4 scroll-mt-32">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <ScrollText className="size-4 text-primary" />
        Policies
      </h2>

      <Tabs defaultValue="cancellation" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
          <TabsTrigger value="payment">Payment Schedule</TabsTrigger>
          <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
        </TabsList>

        <TabsContent value="cancellation" className="mt-4">
          <Card className="p-0 border-border/60 shadow-sm overflow-hidden">
            {!selectedDeparture && (
              <p className="text-sm text-muted-foreground p-4">
                Select a departure date to see its cancellation policy.
              </p>
            )}
            {selectedDeparture && cancellationRules.length === 0 && (
              <p className="text-sm text-muted-foreground p-4">
                No cancellation rules configured for this departure.
              </p>
            )}
            {cancellationRules.length > 0 && (
              <table className="w-full text-sm">
                <thead className="text-[10px] text-muted-foreground uppercase tracking-wider bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">When</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {cancellationRules.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-border/40 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        {whenPhrase(r.days_from, r.days_to, r.date_basis)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatAmount(r, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-4">
          <Card className="p-0 border-border/60 shadow-sm overflow-hidden">
            {!selectedDeparture && (
              <p className="text-sm text-muted-foreground p-4">
                Select a departure date to see its payment schedule.
              </p>
            )}
            {selectedDeparture && paymentSchedule.length === 0 && (
              <p className="text-sm text-muted-foreground p-4">
                No payment schedule configured for this departure.
              </p>
            )}
            {paymentSchedule.length > 0 && (
              <table className="w-full text-sm">
                <thead className="text-[10px] text-muted-foreground uppercase tracking-wider bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Stage</th>
                    <th className="text-left px-4 py-2.5 font-semibold">When</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Amount Due</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentSchedule.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-border/40 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{p.label || "—"}</td>
                      <td className="px-4 py-3">
                        {whenPhrase(p.days_from, p.days_to, p.date_basis)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatPaymentAmount(p, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="mt-4">
          <Card className="p-0 border-border/60 shadow-sm overflow-hidden divide-y divide-border/60">
            <PolicySection title="Terms & Conditions" content={pkg.terms_and_conditions} defaultOpen />
            <PolicySection title="Payment Policy" content={pkg.payment_policy} />
            <PolicySection title="Refund Policy" content={pkg.refund_policy} />
            {!pkg.terms_and_conditions && !pkg.payment_policy && !pkg.refund_policy && (
              <p className="text-sm text-muted-foreground p-4">No terms or refund policy provided.</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}

function PolicySection({
  title,
  content,
  defaultOpen,
}: {
  title: string;
  content: string | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  if (!content) return null;
  const isHtml = looksLikeHtml(content);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left">
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-1">
          {isHtml ? (
            <div
              className="prose prose-sm max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-line">{content}</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

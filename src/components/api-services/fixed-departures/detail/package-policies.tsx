"use client";

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FDPublicDeparture, FDPublicPackage } from "@/types/fd-search";

interface PackagePoliciesProps {
  pkg: FDPublicPackage;
  selectedDeparture: FDPublicDeparture | null;
}

export function PackagePolicies({ pkg, selectedDeparture }: PackagePoliciesProps) {
  const cancellationRules = selectedDeparture
    ? [...selectedDeparture.fd_cancellation_policy].sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const paymentSchedule = selectedDeparture
    ? [...selectedDeparture.fd_payment_schedule].sort((a, b) => a.sort_order - b.sort_order)
    : [];

  return (
    <section id="policies" className="space-y-4 scroll-mt-24">
      <h2 className="text-xl font-semibold">Policies</h2>

      <Tabs defaultValue="cancellation" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
          <TabsTrigger value="payment">Payment Schedule</TabsTrigger>
          <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
        </TabsList>

        <TabsContent value="cancellation" className="mt-4">
          <Card className="p-4 border-border/60 shadow-sm">
            {!selectedDeparture && (
              <p className="text-sm text-muted-foreground">
                Select a departure date to see its cancellation policy.
              </p>
            )}
            {selectedDeparture && cancellationRules.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No cancellation rules configured for this departure.
              </p>
            )}
            {cancellationRules.length > 0 && (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                  <tr>
                    <th className="text-left py-2 font-medium">Days before departure</th>
                    <th className="text-right py-2 font-medium">Cancellation penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {cancellationRules.map((r) => (
                    <tr key={r.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2.5">
                        {r.days_from} – {r.days_to} days
                      </td>
                      <td className="py-2.5 text-right font-medium">
                        {r.penalty_pct != null ? `${r.penalty_pct}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-4">
          <Card className="p-4 border-border/60 shadow-sm space-y-4">
            {!selectedDeparture && (
              <p className="text-sm text-muted-foreground">
                Select a departure date to see its payment schedule.
              </p>
            )}
            {selectedDeparture && paymentSchedule.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No payment schedule configured for this departure.
              </p>
            )}
            {paymentSchedule.length > 0 && (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                  <tr>
                    <th className="text-left py-2 font-medium">Stage</th>
                    <th className="text-left py-2 font-medium">Days before departure</th>
                    <th className="text-right py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentSchedule.map((p) => (
                    <tr key={p.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2.5 font-medium">{p.label || "—"}</td>
                      <td className="py-2.5">
                        {p.days_from != null && p.days_to != null
                          ? `${p.days_from} – ${p.days_to} days`
                          : "—"}
                      </td>
                      <td className="py-2.5 text-right font-medium">
                        {p.amount_pct != null ? `${p.amount_pct}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {pkg.payment_policy && (
              <div className="pt-3 border-t border-border/60">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Payment policy
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {pkg.payment_policy}
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="mt-4">
          <Card className="p-4 border-border/60 shadow-sm space-y-4">
            {pkg.terms_and_conditions && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Terms & conditions
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {pkg.terms_and_conditions}
                </p>
              </div>
            )}
            {pkg.refund_policy && (
              <div className="pt-3 border-t border-border/60">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Refund policy
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {pkg.refund_policy}
                </p>
              </div>
            )}
            {!pkg.terms_and_conditions && !pkg.refund_policy && (
              <p className="text-sm text-muted-foreground">
                No terms or refund policy provided.
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}

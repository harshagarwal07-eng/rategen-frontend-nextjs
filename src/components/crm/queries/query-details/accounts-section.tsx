"use client";

import { useQuery } from "@tanstack/react-query";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getAgentPaymentPlan } from "@/data-access/ops-accounts";
import { BankDetailsPopover } from "./bank-details-popover";

type Props = {
  queryId: string;
};

export default function AccountsSection({ queryId }: Props) {
  const { data: paymentPlan } = useQuery({
    queryKey: ["agent-payment-plan", queryId],
    queryFn: () => getAgentPaymentPlan(queryId),
    enabled: !!queryId,
    staleTime: 0,
  });

  const totalAmount = paymentPlan?.total_amount || 0;
  const totalPaid = paymentPlan?.paid_amount || 0;
  const remaining = totalAmount - totalPaid;
  const currency = paymentPlan?.currency || "USD";

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="accounts" className="border-0">
        <AccordionTrigger className="hover:no-underline py-0 pb-2 cursor-pointer bg-transparent text-xs font-semibold">
          Accounts
        </AccordionTrigger>
        <AccordionContent className="text-foreground font-normal pt-1.5">
          <div className="space-y-2.5 pb-2">
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Summary</p>
                <BankDetailsPopover variant="compact" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Total Amount</span>
                  <span className="text-xs font-semibold block">
                    {totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Currency</span>
                  <span className="text-xs font-semibold block">{currency}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Total Paid</span>
                  <span className="text-xs font-semibold block text-primary">
                    {totalPaid.toFixed(2)}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Due Amount</span>
                  <span className={`text-xs font-semibold block ${remaining > 0 ? "text-destructive" : "text-primary"}`}>
                    {remaining.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

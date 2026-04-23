"use client";

import { IPaymentPlanWithDetails } from "@/types/ops-accounts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getPaymentStatusConfig } from "@/lib/status-styles-config";
import { EyePopover } from "@/components/ui/table/eye-popover";

type Props = {
  paymentPlan: IPaymentPlanWithDetails | null | undefined;
  loading: boolean;
  compactView?: boolean;
};

export default function PaymentDetailsTable({ paymentPlan, loading, compactView = false }: Props) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  // Get installments from payment plan
  const installments = paymentPlan?.installments || [];
  const hasInstallments = installments.length > 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="min-w-[120px] text-xs">Type</TableHead>
            <TableHead className="min-w-28 text-xs">Amount</TableHead>
            <TableHead className="min-w-28 text-xs">Remaining</TableHead>
            <TableHead className="min-w-28 text-xs">Due Date</TableHead>
            <TableHead className="min-w-16 text-xs">Notes</TableHead>
            <TableHead className="min-w-16 text-xs">Payment Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-muted/30">
                  <TableCell>
                    <Skeleton className="h-4 w-11/12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-11/12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-11/12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-11/12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-11/12" />
                  </TableCell>
                </TableRow>
              ))}
            </>
          ) : !paymentPlan ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6">
                <p className="text-xs text-muted-foreground">No payment plan configured</p>
              </TableCell>
            </TableRow>
          ) : !hasInstallments ? (
            // Show single row for payment plan without installments
            <TableRow className="hover:bg-muted/30">
              <TableCell>
                <p className="text-xs font-medium leading-tight">{compactView ? "Total" : "Total Amount"}</p>
              </TableCell>
              <TableCell className="text-xs tabular-nums">{paymentPlan.total_amount.toFixed(2)}</TableCell>
              <TableCell className="text-xs tabular-nums">
                {(paymentPlan.total_amount - paymentPlan.paid_amount).toFixed(2)}
              </TableCell>
              <TableCell className="text-xs">{formatDate(paymentPlan.final_due_date)}</TableCell>
              <TableCell className="p-1">
                {paymentPlan.notes ? (
                  <EyePopover title="Payment Plan Notes" description={paymentPlan.notes} />
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {(() => {
                  const config = getPaymentStatusConfig(paymentPlan.status);
                  return (
                    <Badge variant="secondary" className={cn("text-[10px] px-1.5", config.color, config.bgColor)}>
                      {config.label}
                    </Badge>
                  );
                })()}
              </TableCell>
            </TableRow>
          ) : (
            // Show installments
            installments.map((installment, idx) => {
              const remainingAmount = installment.installment_amount - installment.paid_amount;
              const isLastInstallment = idx === installments.length - 1;

              return (
                <TableRow key={installment.id} className="hover:bg-muted/30">
                  <TableCell>
                    <p className="text-xs font-medium leading-tight">
                      {isLastInstallment
                        ? compactView
                          ? "Final"
                          : "Final Balance"
                        : compactView
                          ? `Inst (${installment.installment_number})`
                          : `Installment ${installment.installment_number}`}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">{installment.installment_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-xs tabular-nums">{remainingAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{formatDate(installment.due_date)}</TableCell>
                  <TableCell className="p-1">
                    {installment.notes ? (
                      <EyePopover
                        title={
                          isLastInstallment
                            ? "Final Balance Notes"
                            : `Installment ${installment.installment_number} Notes`
                        }
                        description={installment.notes}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const config = getPaymentStatusConfig(installment.status);
                      return (
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5", config.color, config.bgColor)}>
                          {config.label}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

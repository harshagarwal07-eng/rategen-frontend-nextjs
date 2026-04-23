"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { IPaymentInstallment } from "@/types/ops-accounts";
import { getPaymentStatusConfig } from "@/lib/status-styles-config";
import { EyePopover } from "@/components/ui/table/eye-popover";

type Props = {
  installments: Omit<IPaymentInstallment, "payment_plan_id" | "created_at" | "updated_at">[];
};

export default function PaymentPlanInstallments({ installments }: Props) {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const getInstallmentAmount = (installment: any) => {
    // Handle both field names: installment_amount (correct) and amount (from SQL)
    return installment.installment_amount ?? installment.amount ?? 0;
  };

  const getPaidAmount = (installment: any) => {
    return installment.paid_amount ?? 0;
  };

  const calculateRemaining = (installment: any) => {
    const amount = getInstallmentAmount(installment);
    const paid = getPaidAmount(installment);
    return amount - paid;
  };

  return (
    <div className="p-4">
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[150px]">Installment</TableHead>
              <TableHead className="text-right w-[120px]">Amount</TableHead>
              <TableHead className="text-right w-[120px]">Paid</TableHead>
              <TableHead className="text-right w-[120px]">Remaining</TableHead>
              <TableHead className="w-[120px]">Due Date</TableHead>
              <TableHead className="w-16">Notes</TableHead>
              <TableHead className="w-[130px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {installments.map((installment, index) => {
              const isLastInstallment = index === installments.length - 1;
              const installmentLabel = isLastInstallment
                ? "Final Balance"
                : `Installment ${installment.installment_number}`;
              const amount = getInstallmentAmount(installment);
              const paid = getPaidAmount(installment);
              const remaining = calculateRemaining(installment);

              return (
                <TableRow key={installment.id}>
                  <TableCell className="font-medium">
                    {installmentLabel}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-green-600">
                    {paid.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-mono text-xs",
                        remaining === 0
                          ? "text-green-600"
                          : installment.status === "overdue"
                            ? "text-red-600"
                            : "text-orange-600"
                      )}
                    >
                      {remaining.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(installment.due_date)}</TableCell>
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
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

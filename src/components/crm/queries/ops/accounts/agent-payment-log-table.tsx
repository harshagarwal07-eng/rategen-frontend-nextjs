"use client";

import { IPaymentTransaction } from "@/types/ops-accounts";
import { approvePaymentTransaction, rejectPaymentTransaction } from "@/data-access/ops-accounts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { openS3File } from "@/lib/s3-upload";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, RefreshCw, ExternalLink, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import RejectPaymentDialog from "./reject-payment-dialog";
import { EyePopover } from "@/components/ui/table/eye-popover";
import { cn } from "@/lib/utils";
import { getPaymentTransactionStatusConfig } from "@/lib/status-styles-config";

type Props = {
  payments: IPaymentTransaction[];
  loading: boolean;
  onPaymentUpdated: () => void;
};

export default function PaymentLogTable({ payments, loading, onPaymentUpdated }: Props) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<IPaymentTransaction | null>(null);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const handleApprove = async (transactionId: string) => {
    const result = await approvePaymentTransaction(transactionId);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Payment approved successfully");
    onPaymentUpdated();
  };

  const openRejectDialog = (payment: IPaymentTransaction) => {
    setSelectedPayment(payment);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedPayment || !rejectionReason.trim()) return;

    const result = await rejectPaymentTransaction(selectedPayment.id, rejectionReason);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Payment rejected successfully");
    setRejectDialogOpen(false);
    setRejectionReason("");
    setSelectedPayment(null);
    onPaymentUpdated();
  };

  const handleViewDocument = async (url: string) => {
    try {
      await openS3File(url);
    } catch (error) {
      toast.error("Failed to open document");
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodLabels: Record<string, string> = {
      bank_transfer: "Bank Transfer",
      credit_card: "Credit Card",
      cash: "Cash",
      cheque: "Cheque",
      upi: "UPI",
      other: "Other",
    };
    return methodLabels[method] || method;
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="min-w-24 text-xs">Type</TableHead>
              <TableHead className="min-w-28 text-xs">Amount</TableHead>
              <TableHead className="min-w-28 text-xs">Date</TableHead>
              <TableHead className="min-w-32 text-xs">Method</TableHead>
              <TableHead className="min-w-28 text-xs">Status</TableHead>
              <TableHead className="min-w-[140px] text-xs">Reference</TableHead>
              <TableHead className="min-w-10 text-xs">Notes</TableHead>
              <TableHead className="min-w-10"></TableHead>
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
                      <Skeleton className="h-4 w-11/12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-11/12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-6" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">
                  <p className="text-xs text-muted-foreground">No payments yet</p>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => {
                const isRefund = payment.transaction_type === "refund";
                return (
                  <TableRow key={payment.id} className="hover:bg-muted/30">
                    <TableCell>
                      <p className={`text-xs font-medium leading-tight ${isRefund ? "text-destructive" : ""}`}>
                        {isRefund ? "Refund" : "Payment"}
                      </p>
                    </TableCell>
                    <TableCell className={`text-xs tabular-nums font-medium ${isRefund ? "text-destructive" : ""}`}>
                      {isRefund ? "-" : ""}
                      {payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(payment.transaction_date)}</TableCell>
                    <TableCell className="text-xs">{getPaymentMethodLabel(payment.payment_method)}</TableCell>
                    <TableCell>
                      {(() => {
                        const config = getPaymentTransactionStatusConfig(payment.approval_status);
                        return (
                          <Badge variant="secondary" className={cn("text-[10px] px-1.5", config.color, config.bgColor)}>
                            {config.label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {payment.transaction_reference ? (
                        <div className="flex items-center gap-1">
                          <Receipt className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                            {payment.transaction_reference}
                          </span>
                          {payment.transaction_reference.startsWith("http") && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleViewDocument(payment.transaction_reference!)}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="p-1">
                      {payment.notes ? (
                        <EyePopover title="Notes" description={payment.notes} />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="p-1">
                      {payment.approval_status === "rejected" ? (
                        <EyePopover
                          title="Rejection Reason"
                          description={payment.rejection_reason || "No reason provided"}
                        />
                      ) : (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {payment.approval_status === "pending" && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="[&>svg:last-child]:hidden">
                                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                  Update Status
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent sideOffset={8}>
                                  <DropdownMenuItem onClick={() => handleApprove(payment.id)}>
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-primary" />
                                      Approve
                                    </div>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openRejectDialog(payment)}>
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-destructive" />
                                      Reject
                                    </div>
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            )}
                            {payment.approval_status === "approved" && (
                              <DropdownMenuItem onClick={() => openRejectDialog(payment)}>
                                <div className="flex items-center gap-2">
                                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                  Reject (Reversal)
                                </div>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <RejectPaymentDialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) {
            setRejectionReason("");
            setSelectedPayment(null);
          }
        }}
        rejectionReason={rejectionReason}
        onRejectionReasonChange={setRejectionReason}
        onConfirm={handleRejectConfirm}
        paymentAmount={selectedPayment?.amount}
        paymentDate={selectedPayment?.transaction_date ? formatDate(selectedPayment.transaction_date) : undefined}
      />
    </>
  );
}

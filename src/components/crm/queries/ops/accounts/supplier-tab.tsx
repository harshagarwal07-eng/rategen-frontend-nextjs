"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SupplierPaymentPlanTable from "./supplier-payment-plan-table";
import SupplierPaymentLogTable from "./supplier-payment-log-table";
import CreatePaymentTransaction from "@/components/forms/ops-forms/create-payment-transaction";
import PaymentConfigurationForm from "@/components/forms/ops-forms/payment-configuration-form";
import { getSupplierPaymentPlans, getSupplierTransactionsForQuery, getServicesWithPaymentPlans } from "@/data-access/ops-accounts";
import { groupServicesByPaymentPlan } from "@/lib/utils/ops-suppliers-utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  queryId: string;
};

export default function SupplierTab({ queryId }: Props) {
  const queryClient = useQueryClient();
  const [editingPaymentPlanId, setEditingPaymentPlanId] = useState<string | null>(null);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<{
    id: string;
    supplierName: string;
    bookingId: string;
  } | null>(null);

  const { data: services = [] } = useQuery({
    queryKey: ["services-with-payment-plans", queryId],
    queryFn: () => getServicesWithPaymentPlans(queryId),
    enabled: !!queryId,
    staleTime: 0,
  });

  // Fetch all supplier payment plans
  const { data: supplierPaymentPlans = [], isFetching: isFetchingPlans } = useQuery({
    queryKey: ["supplier-payment-plans", queryId],
    queryFn: () => getSupplierPaymentPlans(queryId),
    enabled: !!queryId,
    staleTime: 0,
  });

  // Fetch all supplier transactions separately
  const {
    data: allTransactions = [],
    isLoading: logsLoading,
    isFetching: isFetchingLogs,
  } = useQuery({
    queryKey: ["supplier-payment-transactions", queryId],
    queryFn: () => getSupplierTransactionsForQuery(queryId),
    enabled: !!queryId,
    staleTime: 0,
  });

  const handleDataUpdated = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["services-with-payment-plans", queryId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["supplier-payment-plans", queryId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["supplier-payment-transactions", queryId],
    });
  };

  const refreshPaymentPlans = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["supplier-payment-plans", queryId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["services-with-payment-plans", queryId],
    });
  };

  const refreshPaymentTransactions = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["supplier-payment-transactions", queryId],
    });
  };

  const handleEditPaymentPlan = (paymentPlanId: string) => {
    setEditingPaymentPlanId(paymentPlanId);
    setPaymentFormOpen(true);
  };

  const handlePaymentFormSuccess = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["services-with-payment-plans", queryId],
    });
    setEditingPaymentPlanId(null);
    setPaymentFormOpen(false);
    handleDataUpdated();
  };

  // Calculate payment summary from grouped services
  const groupedRows = groupServicesByPaymentPlan(services);
  const paymentSummary = {
    totalAmount: groupedRows.reduce((sum, row) => sum + row.total_amount, 0),
    totalPaid: groupedRows.reduce((sum, row) => sum + (row.total_amount - row.remaining_amount), 0),
    get remaining() {
      return this.totalAmount - this.totalPaid;
    },
    get percentPaid() {
      return this.totalAmount > 0 ? (this.totalPaid / this.totalAmount) * 100 : 0;
    },
  };

  const hasPaymentDetails = groupedRows.length > 0;

  return (
    <div className="p-3 space-y-4">
      {hasPaymentDetails && (
        <div className="inline-flex items-center gap-4 px-3 py-2 rounded-md border bg-card divide-x [&>div]:pr-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Total</p>
            <p className="text-sm font-semibold">{paymentSummary.totalAmount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Paid</p>
            <p className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-primary">{paymentSummary.totalPaid.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">({paymentSummary.percentPaid.toFixed(1)}%)</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Remaining</p>
            <p
              className={`text-sm font-semibold ${paymentSummary.remaining === 0 ? "text-primary" : "text-destructive"}`}
            >
              {paymentSummary.remaining.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Supplier Payment Plans */}
      <SupplierPaymentPlanTable
        queryId={queryId}
        onEditPlan={handleEditPaymentPlan}
        onRefresh={refreshPaymentPlans}
        isFetching={isFetchingPlans}
      />

      {/* Payment Transactions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Payment History</h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={supplierPaymentPlans.length === 0}
              onClick={() => setAddPaymentDialogOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Payment
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={refreshPaymentTransactions}
              disabled={isFetchingLogs}
            >
              <RefreshCw className={`h-3 w-3 ${isFetchingLogs ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <SupplierPaymentLogTable
          payments={allTransactions}
          loading={logsLoading}
          onPaymentUpdated={handleDataUpdated}
        />
      </div>

      {/* Edit Payment Plan Form */}
      {paymentFormOpen && (
        <PaymentConfigurationForm
          queryId={queryId}
          planType="supplier_payable"
          existingPlanId={editingPaymentPlanId}
          open={paymentFormOpen}
          onOpenChange={(open) => {
            if (!open) {
              setPaymentFormOpen(false);
              setTimeout(() => setEditingPaymentPlanId(null), 300);
            }
          }}
          onSuccess={handlePaymentFormSuccess}
        />
      )}

      {/* Select Payment Plan Dialog */}
      <Dialog
        open={addPaymentDialogOpen && !selectedPaymentPlan}
        onOpenChange={(open) => {
          if (!open) {
            setAddPaymentDialogOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-xs sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Supplier</DialogTitle>
            <DialogDescription>Choose which supplier to add payment for</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select
              onValueChange={(value) => {
                const plan = supplierPaymentPlans.find((p) => p.id === value);
                if (plan) {
                  // Use last 8 characters of ID for display
                  const shortId = plan.id.slice(-8);
                  setSelectedPaymentPlan({
                    id: plan.id,
                    supplierName: plan.supplier_name || "Unknown Supplier",
                    bookingId: shortId,
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                {supplierPaymentPlans.map((plan) => {
                  // Show last 8 characters of plan ID
                  const shortId = plan.id.slice(-8);
                  return (
                    <SelectItem key={plan.id} value={plan.id}>
                      <span className="font-mono text-xs text-muted-foreground mr-2">{shortId}</span>
                      <span>-</span>
                      <span className="ml-2">{plan.supplier_name || "Unknown Supplier"}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Transaction Form */}
      {selectedPaymentPlan && (
        <CreatePaymentTransaction
          paymentPlanId={selectedPaymentPlan.id}
          planType="supplier_payable"
          approvedPayments={allTransactions.filter(
            (t) =>
              t.payment_plan_id === selectedPaymentPlan.id &&
              t.approval_status === "approved" &&
              t.transaction_type === "payment"
          )}
          supplierName={`${selectedPaymentPlan.bookingId} - ${selectedPaymentPlan.supplierName}`}
          open={addPaymentDialogOpen && !!selectedPaymentPlan}
          onOpenChange={(open) => {
            if (!open) {
              setAddPaymentDialogOpen(false);
              setTimeout(() => setSelectedPaymentPlan(null), 300);
            }
          }}
          onSuccess={async () => {
            await handleDataUpdated();
            setAddPaymentDialogOpen(false);
            setTimeout(() => setSelectedPaymentPlan(null), 300);
          }}
        />
      )}
    </div>
  );
}

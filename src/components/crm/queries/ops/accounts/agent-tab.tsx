"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PenBox, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAgentPaymentPlan, getTransactionsForPlan } from "@/data-access/ops-accounts";
import PaymentDetailsTable from "./agent-payment-details-table";
import PaymentLogTable from "./agent-payment-log-table";
import CreatePaymentTransaction from "@/components/forms/ops-forms/create-payment-transaction";
import PaymentConfigurationForm from "@/components/forms/ops-forms/payment-configuration-form";

type Props = {
  queryId: string;
};

export default function AgentTab({ queryId }: Props) {
  const queryClient = useQueryClient();
  const [showCreateAgentPayment, setShowCreateAgentPayment] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingPaymentPlanId, setEditingPaymentPlanId] = useState<string | null>(null);

  const {
    data: paymentPlan,
    isLoading: isLoadingDetails,
    isFetching: isFetchingDetails,
  } = useQuery({
    queryKey: ["agent-payment-plan", queryId],
    queryFn: () => getAgentPaymentPlan(queryId),
    enabled: !!queryId,
    staleTime: 0,
  });

  const {
    data: paymentTransactions = [],
    isLoading: isLoadingLogs,
    isFetching: isFetchingLogs,
  } = useQuery({
    queryKey: ["agent-payment-transactions", queryId],
    queryFn: async () => {
      if (!paymentPlan?.id) return [];
      return getTransactionsForPlan(paymentPlan.id);
    },
    enabled: !!queryId && !!paymentPlan?.id,
    staleTime: 0,
  });

  const refreshPaymentData = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["agent-payment-transactions", queryId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["agent-payment-plan", queryId],
    });
  };

  const refreshPaymentPlan = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["agent-payment-plan", queryId],
    });
  };

  const refreshPaymentTransactions = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["agent-payment-transactions", queryId],
    });
  };

  const handlePaymentFormSuccess = async () => {
    await refreshPaymentData();
    setEditingPaymentPlanId(null);
    setPaymentFormOpen(false);
  };

  // Calculate payment summary from new structure
  const paymentSummary = {
    totalAmount: paymentPlan?.total_amount || 0,
    totalPaid: paymentPlan?.paid_amount || 0,
    get remaining() {
      return this.totalAmount - this.totalPaid;
    },
    get percentPaid() {
      return this.totalAmount > 0 ? (this.totalPaid / this.totalAmount) * 100 : 0;
    },
  };

  const hasPaymentDetails = !!paymentPlan;

  return (
    <div className="p-3 space-y-3">
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
            <p className="text-xs text-muted-foreground uppercase ">Remaining</p>
            <p
              className={`text-sm font-semibold ${paymentSummary.remaining === 0 ? "text-primary" : "text-destructive"}`}
            >
              {paymentSummary.remaining.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Payment Schedule Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Payment Schedule</h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                setEditingPaymentPlanId(paymentPlan?.id || null);
                setPaymentFormOpen(true);
              }}
            >
              <PenBox className="h-3 w-3" />
              {paymentPlan ? "Edit Payment Plan" : "Configure Payment"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={refreshPaymentPlan}
              disabled={isFetchingDetails}
            >
              <RefreshCw className={`h-3 w-3 ${isFetchingDetails ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <PaymentDetailsTable paymentPlan={paymentPlan} loading={isLoadingDetails} />
      </div>

      {/* Payment History Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Payment History</h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setShowCreateAgentPayment(true)}
              disabled={!paymentPlan}
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

        <PaymentLogTable payments={paymentTransactions} loading={isLoadingLogs} onPaymentUpdated={refreshPaymentData} />
      </div>

      {/* Payment Plan Configuration */}
      {paymentFormOpen && (
        <PaymentConfigurationForm
          queryId={queryId}
          planType="agent_receivable"
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

      {/* Add Payment Log Dialog */}
      {paymentPlan && (
        <CreatePaymentTransaction
          paymentPlanId={paymentPlan.id}
          planType="agent_receivable"
          approvedPayments={paymentTransactions.filter(
            (t) => t.approval_status === "approved" && t.transaction_type === "payment"
          )}
          open={showCreateAgentPayment}
          onOpenChange={setShowCreateAgentPayment}
          onSuccess={refreshPaymentData}
        />
      )}
    </div>
  );
}

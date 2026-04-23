import { IPaymentTransaction } from "@/types/ops-accounts";

/**
 * Calculate total paid amount from approved transactions
 */
export function calculatePaidAmount(transactions: IPaymentTransaction[]): number {
  return transactions.reduce((sum, txn) => {
    if (txn.approval_status === "approved" && !txn.is_deleted) {
      return sum + (txn.transaction_type === "payment" ? txn.amount : -txn.amount);
    }
    return sum;
  }, 0);
}

/**
 * Calculate remaining amount for a payment plan
 */
export function calculateRemainingAmount(totalAmount: number, paidAmount: number): number {
  return Math.max(0, totalAmount - paidAmount);
}

/**
 * Check if payment plan is overdue
 */
export function isPaymentPlanOverdue(finalDueDate: string | null, paidAmount: number, totalAmount: number): boolean {
  if (!finalDueDate || paidAmount >= totalAmount) {
    return false;
  }
  return new Date(finalDueDate) < new Date();
}

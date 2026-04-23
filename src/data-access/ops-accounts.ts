"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "./auth";
import {
  IPaymentPlan,
  IPaymentInstallment,
  IPaymentTransaction,
  IPaymentPlanWithDetails,
  ICreatePaymentPlanInput,
  IUpdatePaymentPlanInput,
  PaymentPlanType,
  PaymentLogStatus,
  ServiceWithPaymentPlan,
  GlobalPaymentTransaction,
  PurchaseBySupplier,
  SupplierLedgerRow,
  PurchaseByItem,
  ItemPurchaseBySupplier,
  SalesByAgent,
  AgentLedgerRow,
  SalesByItem,
  ItemSalesByAgent,
} from "@/types/ops-accounts";

//Get payment plan by ID with optional related data
export async function getPaymentPlan(
  planId: string,
  options?: {
    includeInstallments?: boolean;
    includeTransactions?: boolean;
    includeServiceCount?: boolean;
  }
): Promise<IPaymentPlanWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_query_payment_plans")
    .select("*")
    .eq("id", planId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    console.error("Error fetching payment plan:", error);
    return null;
  }

  const plan = data as IPaymentPlan;
  const result: IPaymentPlanWithDetails = {
    ...plan,
    installments: [],
  };

  // Fetch installments if requested
  if (options?.includeInstallments) {
    const { data: installments } = await supabase
      .from("whitelabel_query_payment_installments")
      .select("*")
      .eq("payment_plan_id", planId)
      .order("installment_number");

    result.installments = (installments || []) as IPaymentInstallment[];
  }

  // Fetch transactions if requested
  if (options?.includeTransactions) {
    const { data: transactions } = await supabase
      .from("whitelabel_query_payment_transactions")
      .select("*")
      .eq("payment_plan_id", planId)
      .eq("is_deleted", false)
      .order("transaction_date", { ascending: false });

    result.transactions = (transactions || []) as IPaymentTransaction[];
  }

  // Count linked bookings if requested
  if (options?.includeServiceCount && plan.plan_type === "supplier_payable") {
    const { count } = await supabase
      .from("whitelabel_bookings")
      .select("*", { count: "exact", head: true })
      .eq("payment_plan_id", planId);

    result.booking_count = count || 0;
  }

  return result;
}

//Get active agent payment plan for a query
export async function getAgentPaymentPlan(queryId: string): Promise<IPaymentPlanWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_query_payment_plans")
    .select("*")
    .eq("query_id", queryId)
    .eq("plan_type", "agent_receivable")
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return getPaymentPlan(data.id, {
    includeInstallments: true,
    includeTransactions: true,
  });
}

//Get supplier payment plans for a query
export async function getSupplierPaymentPlans(
  queryId: string,
  supplierId?: string
): Promise<IPaymentPlanWithDetails[]> {
  const supabase = await createClient();

  let query = supabase
    .from("vw_payment_plan_summary")
    .select("*")
    .eq("query_id", queryId)
    .eq("plan_type", "supplier_payable")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching supplier payment plans:", error);
    return [];
  }

  const plans = (data || []) as any[];

  // Fetch installments for each plan (view provides counts, but we need full installment details)
  const results = await Promise.all(
    plans.map(async (plan) => {
      const { data: installments } = await supabase
        .from("whitelabel_query_payment_installments")
        .select("*")
        .eq("payment_plan_id", plan.id)
        .order("installment_number");

      const result: IPaymentPlanWithDetails = {
        ...plan,
        installments: (installments || []) as IPaymentInstallment[],
      };

      return result;
    })
  );

  return results;
}

/**
 * Create or update payment plan using RPC with versioning support
 *
 * UPDATE behavior:
 * - Creates a new version of the plan
 * - Marks the old version as inactive
 * - Preserves old version for audit trail
 * - Migrates approved transactions and service mappings to new version
 */
export async function upsertPaymentPlan(
  input: ICreatePaymentPlanInput | IUpdatePaymentPlanInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const isUpdate = "plan_id" in input;

  // For updates, we need to fetch the original plan details to pass required fields
  let queryId: string | undefined;
  let planType: PaymentPlanType | undefined;
  let supplierId: string | null | undefined;

  if (isUpdate) {
    const originalPlan = await getPaymentPlan((input as IUpdatePaymentPlanInput).plan_id);
    if (!originalPlan) {
      return { success: false, error: "Original payment plan not found" };
    }
    queryId = originalPlan.query_id;
    planType = originalPlan.plan_type;
    supplierId = originalPlan.supplier_id;
  } else {
    const createInput = input as ICreatePaymentPlanInput;
    queryId = createInput.query_id;
    planType = createInput.plan_type;
    supplierId = createInput.supplier_id;
  }

  // Prepare RPC parameters
  const rpcParams: any = {
    p_plan_id: isUpdate ? (input as IUpdatePaymentPlanInput).plan_id : null,
    p_query_id: queryId,
    p_plan_type: planType,
    p_supplier_id: supplierId || null,
    p_total_amount: input.total_amount,
    p_final_due_date: input.final_due_date || null,
    p_currency: input.currency || "USD",
    p_notes: input.notes || null,
    p_created_by: user.id,
    p_installments: input.installments && input.installments.length > 0 ? input.installments : null,
    p_booking_ids: !isUpdate && "booking_ids" in input && input.booking_ids ? input.booking_ids : null,
  };

  const { data, error } = await supabase.rpc("upsert_payment_plan_with_services", rpcParams);

  if (error) {
    console.error("Error upserting payment plan:", error);
    return { success: false, error: error.message };
  }

  // Check if RPC returned an error
  if (data && typeof data === "object" && "success" in data && !data.success) {
    console.log(data.error);
    return { success: false, error: data.error || "Failed to upsert payment plan" };
  }

  return { success: true, data };
}

export async function getServicesWithPaymentPlans(queryId: string): Promise<ServiceWithPaymentPlan[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_services_with_payment_plans", {
    p_query_id: queryId,
  });

  if (error) {
    console.error("Error fetching services with payment plans:", error);
    return [];
  }

  return data || [];
}

//Get bookings linked to a payment plan
export async function getBookingsForPaymentPlan(planId: string): Promise<any[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_whitelabel_booking_details")
    .select("*")
    .eq("payment_plan_id", planId);

  if (error) {
    console.error("Error fetching bookings for payment plan:", error);
    return [];
  }

  return data || [];
}

// ============= PAYMENT INSTALLMENT FUNCTIONS =============

//Get transactions for a payment plan
export async function getTransactionsForPlan(planId: string, includeDeleted = false): Promise<IPaymentTransaction[]> {
  const supabase = await createClient();

  let query = supabase
    .from("whitelabel_query_payment_transactions")
    .select("*")
    .eq("payment_plan_id", planId)
    .order("transaction_date", { ascending: false });

  if (!includeDeleted) {
    query = query.eq("is_deleted", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }

  return (data || []) as IPaymentTransaction[];
}

//Get approved transactions for calculating paid amounts
export async function getApprovedTransactionsForPlan(planId: string): Promise<IPaymentTransaction[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_query_payment_transactions")
    .select("*")
    .eq("payment_plan_id", planId)
    .eq("approval_status", "approved")
    .eq("is_deleted", false)
    .order("transaction_date", { ascending: false });

  if (error) {
    console.error("Error fetching approved transactions:", error);
    return [];
  }

  return (data || []) as IPaymentTransaction[];
}

//Get all transactions for supplier payment plans in a query
export async function getSupplierTransactionsForQuery(queryId: string): Promise<IPaymentTransaction[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_query_payment_transactions")
    .select(
      `
      *,
      payment_plan:whitelabel_query_payment_plans!inner(
        query_id,
        plan_type
      )
    `
    )
    .eq("payment_plan.query_id", queryId)
    .eq("payment_plan.plan_type", "supplier_payable")
    .eq("is_deleted", false)
    .order("transaction_date", { ascending: false });

  if (error) {
    console.error("Error fetching supplier transactions:", error);
    return [];
  }

  return (data || []).map(({ payment_plan, ...transaction }) => transaction) as IPaymentTransaction[];
}

// ============= PAYMENT TRANSACTION MANAGEMENT FUNCTIONS =============

/**
 * Approve a payment transaction using the V3 RPC
 * Triggers automatic amount recalculation and distribution
 */
export async function approvePaymentTransaction(
  transactionId: string,
  notes?: string | null
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const { data, error } = await supabase.rpc("approve_payment_transaction", {
    p_transaction_id: transactionId,
    p_approved_by: user.id,
    p_notes: notes || null,
  });

  if (error) {
    console.error("Error approving payment transaction:", error);
    return { success: false, error: error.message };
  }

  // Check if RPC returned an error
  if (data && typeof data === "object" && "success" in data && !data.success) {
    return { success: false, error: data.error || "Failed to approve payment transaction" };
  }

  return { success: true, data };
}

/**
 * Reject a payment transaction using the V3 RPC
 * If previously approved, triggers automatic amount reversal
 */
export async function rejectPaymentTransaction(
  transactionId: string,
  rejection_reason: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  if (!rejection_reason || rejection_reason.trim() === "") {
    return { success: false, error: "Rejection reason is required" };
  }

  const { data, error } = await supabase.rpc("reject_payment_transaction", {
    p_transaction_id: transactionId,
    p_rejected_by: user.id,
    p_rejection_reason: rejection_reason,
  });

  if (error) {
    console.error("Error rejecting payment transaction:", error);
    return { success: false, error: error.message };
  }

  // Check if RPC returned an error
  if (data && typeof data === "object" && "success" in data && !data.success) {
    return { success: false, error: data.error || "Failed to reject payment transaction" };
  }

  return { success: true, data };
}

/**
 * Record a payment transaction using the V3 RPC
 * Supports auto-approval
 * For refunds, use recordRefundTransaction instead
 */
export async function recordPaymentTransaction(input: {
  payment_plan_id: string;
  amount: number;
  transaction_date: string;
  payment_method: "bank_transfer" | "credit_card" | "cash" | "cheque" | "upi" | "other";
  transaction_reference?: string | null;
  notes?: string | null;
  auto_approve?: boolean;
  approved_by?: string | null;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const { data, error } = await supabase.rpc("record_payment_transaction", {
    p_payment_plan_id: input.payment_plan_id,
    p_amount: input.amount,
    p_transaction_date: input.transaction_date,
    p_payment_method: input.payment_method,
    p_recorded_by: user.id,
    p_transaction_reference: input.transaction_reference || null,
    p_notes: input.notes || null,
    p_auto_approve: input.auto_approve || false,
    p_approved_by: input.approved_by || user.id,
  });

  if (error) {
    console.error("Error recording payment transaction:", error);
    return { success: false, error: error.message };
  }

  // Check if RPC returned an error
  if (data && typeof data === "object" && "success" in data && !data.success) {
    return { success: false, error: data.error || "Failed to record payment transaction" };
  }

  return { success: true, data };
}

/**
 * Record a refund transaction using the V3 RPC
 * Supports auto-approval and validates against original transaction
 */
export async function recordRefundTransaction(input: {
  payment_plan_id: string;
  amount: number;
  transaction_date: string;
  payment_method: "bank_transfer" | "credit_card" | "cash" | "cheque" | "upi" | "other";
  refund_of_transaction_id: string;
  refund_reason: string;
  transaction_reference?: string | null;
  notes?: string | null;
  auto_approve?: boolean;
  approved_by?: string | null;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const { data, error } = await supabase.rpc("record_refund_transaction", {
    p_payment_plan_id: input.payment_plan_id,
    p_amount: input.amount,
    p_transaction_date: input.transaction_date,
    p_payment_method: input.payment_method,
    p_recorded_by: user.id,
    p_refund_of_transaction_id: input.refund_of_transaction_id,
    p_refund_reason: input.refund_reason,
    p_transaction_reference: input.transaction_reference || null,
    p_notes: input.notes || null,
    p_auto_approve: input.auto_approve || false,
    p_approved_by: input.approved_by || user.id,
  });

  if (error) {
    console.error("Error recording refund transaction:", error);
    return { success: false, error: error.message };
  }

  // Check if RPC returned an error
  if (data && typeof data === "object" && "success" in data && !data.success) {
    return { success: false, error: data.error || "Failed to record refund transaction" };
  }

  return { success: true, data };
}

// ============= GLOBAL ACCOUNTS VIEW FUNCTIONS =============

export async function getGlobalPaymentPlans(params: {
  plan_type: PaymentPlanType;
  status?: string[];
  search?: string;
  search_field?: string;
  agency?: string[];
  start_date?: string;
  end_date?: string;
  page?: number;
  perPage?: number;
  sort?: Array<{ id: string; desc: boolean }>;
}): Promise<{ data: IPaymentPlanWithDetails[]; totalItems: number }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], totalItems: 0 };

  const {
    plan_type,
    status,
    search,
    search_field,
    agency,
    start_date,
    end_date,
    page = 1,
    perPage = 50,
    sort,
  } = params;

  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const isAgent = plan_type === "agent_receivable";

  const sortColumnMap: Record<string, string> = {
    agency_name: "agency_name",
    supplier_name: "supplier_name",
    total_amount: "total_amount",
    paid_amount: "paid_amount",
    remaining_amount: "remaining_amount",
    final_due_date: "final_due_date",
    status: "status",
    created_at: "created_at",
  };

  const sortField = sort?.[0]?.id ? (sortColumnMap[sort[0].id] ?? "created_at") : "created_at";
  const sortDesc = sort?.[0]?.desc ?? true;

  if (isAgent) {
    let query = supabase
      .from("vw_whitelabel_payment_plans")
      .select("*, installments:whitelabel_query_payment_installments!payment_plan_id(*)", { count: "exact" })
      .eq("dmc_id", user.dmc.id)
      .eq("is_active", true)
      .order(sortField, { ascending: !sortDesc })
      .range(start, end);

    if (status && status.length > 0) {
      query = query.in("status", status);
    }
    if (agency && agency.length > 0) {
      query = query.in("agency_name", agency);
    }
    if (start_date) {
      query = query.gte("final_due_date", start_date);
    }
    if (end_date) {
      query = query.lte("final_due_date", end_date);
    }
    if (search) {
      const fieldMap: Record<string, string> = {
        query_id: "short_query_id",
        lead_pax: "traveler_name",
        agency: "agency_name",
      };
      const dbField = search_field ? fieldMap[search_field] : null;
      if (dbField) {
        query = query.ilike(dbField, `%${search}%`);
      } else {
        query = query.or(
          `agency_name.ilike.%${search}%,short_query_id.ilike.%${search}%,traveler_name.ilike.%${search}%`
        );
      }
    }

    const { data, error, count } = await query;
    if (error) {
      console.error("Error fetching global agent payment plans:", error);
      return { data: [], totalItems: 0 };
    }
    return { data: (data || []) as IPaymentPlanWithDetails[], totalItems: count || 0 };
  }

  let query = supabase
    .from("vw_whitelabel_payment_plans")
    .select("*, installments:whitelabel_query_payment_installments!payment_plan_id(*)", { count: "exact" })
    .eq("plan_type", plan_type)
    .eq("dmc_id", user.dmc.id)
    .eq("is_active", true)
    .order(sortField, { ascending: !sortDesc })
    .range(start, end);

  if (status && status.length > 0) {
    query = query.in("status", status);
  }

  if (agency && agency.length > 0) {
    query = query.in("supplier_name", agency);
  }

  if (start_date) {
    query = query.gte("final_due_date", start_date);
  }
  if (end_date) {
    query = query.lte("final_due_date", end_date);
  }

  if (search) {
    const fieldMap: Record<string, string> = {
      query_id: "short_query_id",
      lead_pax: "traveler_name",
      supplier_name: "supplier_name",
    };
    const dbField = search_field ? fieldMap[search_field] : null;
    if (dbField) {
      query = query.ilike(dbField, `%${search}%`);
    } else {
      query = query.or(
        `supplier_name.ilike.%${search}%,short_query_id.ilike.%${search}%,traveler_name.ilike.%${search}%`
      );
    }
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching global payment plans:", error);
    return { data: [], totalItems: 0 };
  }

  return { data: (data || []) as IPaymentPlanWithDetails[], totalItems: count || 0 };
}

export async function getGlobalTransactions(params: {
  search?: string;
  plan_type?: string[];
  approval_status?: string[];
  payment_method?: string[];
  transaction_type?: string[];
  start_date?: string;
  end_date?: string;
  page?: number;
  perPage?: number;
  sort?: Array<{ id: string; desc: boolean }>;
}): Promise<{ data: GlobalPaymentTransaction[]; totalItems: number }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], totalItems: 0 };

  const {
    search,
    plan_type,
    approval_status,
    payment_method,
    transaction_type,
    start_date,
    end_date,
    page = 1,
    perPage = 50,
    sort,
  } = params;

  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const sortColumnMap: Record<string, string> = {
    transaction_date: "transaction_date",
    amount: "amount",
    receipts: "receipt_amount",
    payments: "payment_amount",
    approval_status: "approval_status",
    payment_method: "payment_method",
    transaction_type: "transaction_type",
    created_at: "created_at",
  };

  const sortField = sort?.[0]?.id ? (sortColumnMap[sort[0].id] ?? "transaction_date") : "transaction_date";
  const sortDesc = sort?.[0]?.desc ?? true;

  let query = supabase
    .from("vw_whitelabel_payment_transctions")
    .select("*", { count: "exact" })
    .eq("is_deleted", false)
    .eq("plan_is_active", true)
    .eq("dmc_id", user.dmc.id)
    .order(sortField, { ascending: !sortDesc })
    .range(start, end);

  if (plan_type && plan_type.length > 0) {
    query = query.in("plan_type", plan_type);
  }

  if (approval_status && approval_status.length > 0) {
    query = query.in("approval_status", approval_status);
  }

  if (payment_method && payment_method.length > 0) {
    query = query.in("payment_method", payment_method);
  }

  if (transaction_type && transaction_type.length > 0) {
    query = query.in("transaction_type", transaction_type);
  }

  if (start_date) {
    query = query.gte("transaction_date", start_date);
  }
  if (end_date) {
    query = query.lte("transaction_date", end_date);
  }

  if (search) {
    query = query.or(`transaction_reference.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching global transactions:", error);
    return { data: [], totalItems: 0 };
  }

  return { data: (data || []) as GlobalPaymentTransaction[], totalItems: count || 0 };
}

export async function updateTransactionApprovalStatus(
  transactionId: string,
  status: PaymentLogStatus
): Promise<{ error: string | null }> {
  if (status === "approved") {
    const result = await approvePaymentTransaction(transactionId);
    return { error: result.error ?? null };
  }

  if (status === "rejected") {
    const result = await rejectPaymentTransaction(transactionId, "Rejected via CRM");
    return { error: result.error ?? null };
  }

  // Reset to pending via direct update
  const supabase = await createClient();
  const { error } = await supabase
    .from("whitelabel_query_payment_transactions")
    .update({ approval_status: "pending" })
    .eq("id", transactionId);

  return { error: error?.message ?? null };
}

// ============= PURCHASES FUNCTIONS =============

export async function getSupplierLedger(
  supplierId: string,
  startDate?: string,
  endDate?: string
): Promise<SupplierLedgerRow[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return [];

  let query = supabase
    .from("supplier_purchase_ledger")
    .select("*")
    .eq("dmc_id", user.dmc.id)
    .eq("supplier_id", supplierId)
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (startDate) query = query.gte("entry_date", startDate);
  if (endDate) query = query.lte("entry_date", endDate);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching supplier ledger:", error);
    return [];
  }

  const periodRows = data || [];

  // Derive opening balance from the first period row — no second DB call needed.
  // balance is a running total maintained by triggers: purchase/refund adds, payment subtracts.
  // So: opening_balance = first_row.balance - first_row.amount (purchase/refund)
  //                     = first_row.balance + first_row.amount (payment)
  const firstRow = periodRows[0];
  const openingBalance = firstRow
    ? firstRow.entry_type === "payment"
      ? Number(firstRow.balance) + Number(firstRow.amount)
      : Number(firstRow.balance) - Number(firstRow.amount)
    : 0;

  return [
    {
      row_date: startDate ?? null,
      row_type: "opening_balance",
      details: "Opening Balance",
      amount: 0,
      payment: 0,
      balance: openingBalance,
      query_id: null,
      service_type: null,
    },
    ...periodRows.map(
      (row) =>
        ({
          row_date: row.entry_date,
          row_type: row.entry_type,
          details: row.details,
          amount: row.entry_type === "purchase" ? Number(row.amount) : 0,
          payment:
            row.entry_type === "payment" ? Number(row.amount) : row.entry_type === "refund" ? -Number(row.amount) : 0,
          balance: Number(row.balance),
          query_id: row.query_short_id,
          service_type: row.service_type,
        }) as SupplierLedgerRow
    ),
  ];
}

export async function getPurchasesBySupplier(params: {
  start_date?: string;
  end_date?: string;
  search?: string;
  service_type?: string[];
  page?: number;
  perPage?: number;
  sort?: Array<{ id: string; desc: boolean }>;
}): Promise<{ data: PurchaseBySupplier[]; totalItems: number }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], totalItems: 0 };

  const { start_date, end_date, search, service_type, page = 1, perPage = 50, sort } = params;

  // 1. Fetch all ledger rows from view (date-filtered)
  let viewQuery = supabase
    .from("vw_supplier_purchase_ledger")
    .select(
      "supplier_id, supplier_name, supplier_city, supplier_country, entry_type, service_type, booking_id, adults, children, infants, amount, currency"
    )
    .eq("dmc_id", user.dmc.id)
    .not("supplier_id", "is", null)
    .limit(100000);

  if (start_date) viewQuery = viewQuery.gte("entry_date", start_date);
  if (end_date) viewQuery = viewQuery.lte("entry_date", end_date);

  const { data: rows, error } = await viewQuery;
  if (error) {
    console.error("Error fetching purchases by supplier:", error);
    return { data: [], totalItems: 0 };
  }
  if (!rows?.length) return { data: [], totalItems: 0 };

  // 2. Aggregate by supplier
  type SupplierAgg = PurchaseBySupplier & { _seenBookings: Set<string>; _svcTypeSet: Set<string> };
  const aggMap = new Map<string, SupplierAgg>();

  for (const row of rows) {
    const suppId = row.supplier_id as string;
    // service_type filter: skip purchase rows that don't match; always include payment/refund for balance
    if (service_type?.length && row.entry_type === "purchase" && !service_type.includes(row.service_type)) continue;

    if (!aggMap.has(suppId)) {
      aggMap.set(suppId, {
        supplier_id: suppId,
        supplier_name: row.supplier_name ?? "",
        supplier_city: row.supplier_city ?? null,
        supplier_country: row.supplier_country ?? null,
        service_types: [],
        service_count: 0,
        total_adults: 0,
        total_children: 0,
        total_infants: 0,
        total_amount: 0,
        total_paid: 0,
        balance: 0,
        currency: row.currency ?? "USD",
        _seenBookings: new Set(),
        _svcTypeSet: new Set(),
      });
    }
    const agg = aggMap.get(suppId)!;
    if (row.entry_type === "purchase") {
      if (!agg._seenBookings.has(row.booking_id)) {
        agg._seenBookings.add(row.booking_id);
        agg.service_count++;
      }
      agg.total_adults += row.adults ?? 0;
      agg.total_children += row.children ?? 0;
      agg.total_infants += row.infants ?? 0;
      agg.total_amount += Number(row.amount ?? 0);
      if (row.service_type && !agg._svcTypeSet.has(row.service_type)) {
        agg._svcTypeSet.add(row.service_type);
        agg.service_types.push(row.service_type);
      }
    } else if (row.entry_type === "payment") {
      agg.total_paid += Number(row.amount ?? 0);
    } else if (row.entry_type === "refund") {
      agg.total_amount -= Number(row.amount ?? 0);
    }
  }

  // 3. Build result with search filter and balance
  const allSuppliers: PurchaseBySupplier[] = [];
  for (const [, { _seenBookings: _sb, _svcTypeSet: _st, ...supplier }] of aggMap) {
    supplier.balance = supplier.total_amount - supplier.total_paid;
    if (search) {
      const s = search.toLowerCase();
      if (
        !supplier.supplier_name?.toLowerCase().includes(s) &&
        !supplier.supplier_city?.toLowerCase().includes(s) &&
        !supplier.supplier_country?.toLowerCase().includes(s)
      )
        continue;
    }
    allSuppliers.push(supplier);
  }

  // 4. Sort
  const sortField = sort?.[0];
  allSuppliers.sort((a, b) => {
    if (!sortField) return b.total_amount - a.total_amount;
    const av = (a as unknown as Record<string, unknown>)[sortField.id];
    const bv = (b as unknown as Record<string, unknown>)[sortField.id];
    const cmp = typeof av === "string" ? (av as string).localeCompare(bv as string) : Number(av) - Number(bv);
    return sortField.desc ? -cmp : cmp;
  });

  // 5. Paginate
  const totalItems = allSuppliers.length;
  const offset = (page - 1) * perPage;
  return { data: allSuppliers.slice(offset, offset + perPage), totalItems };
}

export async function getPurchasesByItem(params: {
  start_date?: string;
  end_date?: string;
  search?: string;
  service_type?: string[];
  page?: number;
  perPage?: number;
  sort?: Array<{ id: string; desc: boolean }>;
}): Promise<{ data: PurchaseByItem[]; totalItems: number }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], totalItems: 0 };

  const { start_date, end_date, search, service_type, page = 1, perPage = 50, sort } = params;

  // 1. Fetch purchase rows from view
  let viewQuery = supabase
    .from("vw_supplier_purchase_ledger")
    .select("item_key, service_name, service_type, adults, children, infants, amount, currency, purchase_units")
    .eq("dmc_id", user.dmc.id)
    .eq("entry_type", "purchase")
    .not("item_key", "is", null)
    .limit(100000);

  if (start_date) viewQuery = viewQuery.gte("entry_date", start_date);
  if (end_date) viewQuery = viewQuery.lte("entry_date", end_date);
  if (service_type?.length) viewQuery = viewQuery.in("service_type", service_type);
  if (search) viewQuery = viewQuery.ilike("service_name", `%${search}%`);

  const { data: rows, error } = await viewQuery;
  if (error) {
    console.error("Error fetching purchases by item:", error);
    return { data: [], totalItems: 0 };
  }
  if (!rows?.length) return { data: [], totalItems: 0 };

  // 2. Aggregate by item_key
  const itemMap = new Map<string, PurchaseByItem>();
  for (const row of rows) {
    const key = row.item_key as string;
    const svcType = row.service_type as string;
    if (!itemMap.has(key)) {
      itemMap.set(key, {
        item_id: key,
        service_name: row.service_name,
        service_type: svcType,
        purchase_count: 0,
        purchase_unit:
          svcType === "hotel"
            ? "room nights"
            : svcType === "tour"
              ? "tours"
              : svcType === "transfer"
                ? "transfers"
                : "services",
        total_adults: 0,
        total_children: 0,
        total_infants: 0,
        total_amount: 0,
        currency: row.currency ?? "USD",
      });
    }
    const agg = itemMap.get(key)!;
    agg.purchase_count += Number(row.purchase_units ?? 0);
    agg.total_adults += row.adults ?? 0;
    agg.total_children += row.children ?? 0;
    agg.total_infants += row.infants ?? 0;
    agg.total_amount += Number(row.amount ?? 0);
  }

  const allItems: PurchaseByItem[] = [...itemMap.values()];

  // 3. Sort
  const sortField = sort?.[0];
  allItems.sort((a, b) => {
    if (!sortField) return b.total_amount - a.total_amount;
    const av = (a as unknown as Record<string, unknown>)[sortField.id];
    const bv = (b as unknown as Record<string, unknown>)[sortField.id];
    const cmp = typeof av === "string" ? (av as string).localeCompare(bv as string) : Number(av) - Number(bv);
    return sortField.desc ? -cmp : cmp;
  });

  // 4. Paginate
  const totalItems = allItems.length;
  const offset = (page - 1) * perPage;
  return { data: allItems.slice(offset, offset + perPage), totalItems };
}

export async function getItemPurchasesBySupplier(
  itemId: string,
  startDate?: string,
  endDate?: string
): Promise<ItemPurchaseBySupplier[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return [];

  // 1. Fetch purchase rows for this item from view
  let viewQuery = supabase
    .from("vw_supplier_purchase_ledger")
    .select("supplier_id, supplier_name, service_type, adults, children, infants, amount, purchase_units")
    .eq("dmc_id", user.dmc.id)
    .eq("entry_type", "purchase")
    .eq("item_key", itemId)
    .not("supplier_id", "is", null)
    .limit(10000);

  if (startDate) viewQuery = viewQuery.gte("entry_date", startDate);
  if (endDate) viewQuery = viewQuery.lte("entry_date", endDate);

  const { data: rows, error } = await viewQuery;
  if (error) {
    console.error("Error fetching item purchases by supplier:", error);
    return [];
  }
  if (!rows?.length) return [];

  // 2. Aggregate by supplier
  const aggMap = new Map<string, ItemPurchaseBySupplier>();
  for (const row of rows) {
    const suppId = row.supplier_id as string;
    const svcType = row.service_type as string;
    if (!aggMap.has(suppId)) {
      aggMap.set(suppId, {
        supplier_id: suppId,
        supplier_name: row.supplier_name ?? "",
        service_type: svcType,
        purchase_count: 0,
        purchase_unit:
          svcType === "hotel"
            ? "room nights"
            : svcType === "tour"
              ? "tours"
              : svcType === "transfer"
                ? "transfers"
                : "services",
        total_adults: 0,
        total_children: 0,
        total_infants: 0,
        total_amount: 0,
      });
    }
    const agg = aggMap.get(suppId)!;
    agg.purchase_count += Number(row.purchase_units ?? 0);
    agg.total_adults += row.adults ?? 0;
    agg.total_children += row.children ?? 0;
    agg.total_infants += row.infants ?? 0;
    agg.total_amount += Number(row.amount ?? 0);
  }

  return [...aggMap.values()].sort((a, b) => b.total_amount - a.total_amount);
}

// =====================================================
// Sales Functions
// =====================================================

export async function getAgentLedger(
  agencyId: string,
  startDate?: string,
  endDate?: string
): Promise<AgentLedgerRow[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return [];

  let query = supabase
    .from("agent_sales_ledger")
    .select("*")
    .eq("dmc_id", user.dmc.id)
    .eq("tas_id", agencyId)
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (startDate) query = query.gte("entry_date", startDate);
  if (endDate) query = query.lte("entry_date", endDate);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching agent ledger:", error);
    return [];
  }

  const periodRows = data || [];

  // Derive opening balance from the first period row — no second DB call needed.
  // balance is a running total maintained by triggers: sale/refund adds, payment subtracts.
  // So: opening_balance = first_row.balance - first_row.amount (sale/refund)
  //                     = first_row.balance + first_row.amount (payment)
  const firstRow = periodRows[0];
  const openingBalance = firstRow
    ? firstRow.entry_type === "payment"
      ? Number(firstRow.balance) + Number(firstRow.amount)
      : Number(firstRow.balance) - Number(firstRow.amount)
    : 0;

  return [
    {
      row_date: startDate ?? null,
      row_type: "opening_balance",
      details: "Opening Balance",
      amount: 0,
      payment: 0,
      balance: openingBalance,
      query_id: null,
      service_type: null,
    },
    ...periodRows.map(
      (row) =>
        ({
          row_date: row.entry_date,
          row_type: row.entry_type,
          details: row.details,
          amount: row.entry_type === "sale" ? Number(row.amount) : 0,
          payment:
            row.entry_type === "payment" ? Number(row.amount) : row.entry_type === "refund" ? -Number(row.amount) : 0,
          balance: Number(row.balance),
          query_id: row.query_short_id,
          service_type: row.service_type,
        }) as AgentLedgerRow
    ),
  ];
}

export async function getSalesByAgent(params: {
  start_date?: string;
  end_date?: string;
  search?: string;
  service_type?: string[];
  page?: number;
  perPage?: number;
  sort?: Array<{ id: string; desc: boolean }>;
}): Promise<{ data: SalesByAgent[]; totalItems: number }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], totalItems: 0 };

  const { start_date, end_date, search, service_type, page = 1, perPage = 50, sort } = params;

  // Fetch service rows from view — filters applied at DB level
  let viewQuery = supabase
    .from("vw_agent_sales_service_details")
    .select(
      "tas_id, agency_name, agency_city, agency_country, agency_address, service_type, adults, children, infants, currency, query_total_amount, query_id"
    )
    .eq("dmc_id", user.dmc.id)
    .limit(10000);

  if (start_date) viewQuery = viewQuery.gte("entry_date", start_date);
  if (end_date) viewQuery = viewQuery.lte("entry_date", end_date);
  if (search) viewQuery = viewQuery.ilike("agency_name", `%${search}%`);
  if (service_type?.length) viewQuery = viewQuery.in("service_type", service_type);

  const { data: serviceRows, error } = await viewQuery;
  if (error) {
    console.error("Error fetching sales by agent:", error);
    return { data: [], totalItems: 0 };
  }
  if (!serviceRows?.length) return { data: [], totalItems: 0 };

  // Aggregate in server
  type AgentAgg = SalesByAgent & { _seenQueries: Set<string>; _svcTypeSet: Set<string> };
  const agentMap = new Map<string, AgentAgg>();

  for (const row of serviceRows) {
    if (!agentMap.has(row.tas_id)) {
      agentMap.set(row.tas_id, {
        agency_id: row.tas_id,
        agency_name: row.agency_name,
        agency_city: row.agency_city,
        agency_country: row.agency_country,
        agency_address: row.agency_address,
        service_types: [],
        service_count: 0,
        total_adults: 0,
        total_children: 0,
        total_infants: 0,
        total_amount: 0,
        currency: row.currency,
        _seenQueries: new Set(),
        _svcTypeSet: new Set(),
      });
    }
    const agg = agentMap.get(row.tas_id)!;
    agg.service_count++;
    agg.total_adults += row.adults ?? 0;
    agg.total_children += row.children ?? 0;
    agg.total_infants += row.infants ?? 0;
    if (row.service_type && !agg._svcTypeSet.has(row.service_type)) {
      agg._svcTypeSet.add(row.service_type);
      agg.service_types.push(row.service_type);
    }
    // Count query amount only once — multiple services per query share the same total
    if (!agg._seenQueries.has(row.query_id)) {
      agg._seenQueries.add(row.query_id);
      agg.total_amount += Number(row.query_total_amount ?? 0);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const allAgents: SalesByAgent[] = [...agentMap.values()].map(({ _seenQueries, _svcTypeSet, ...a }) => a);

  // 4. Sort
  const sortField = sort?.[0];
  allAgents.sort((a, b) => {
    if (!sortField) return b.total_amount - a.total_amount;
    const av = (a as unknown as Record<string, unknown>)[sortField.id];
    const bv = (b as unknown as Record<string, unknown>)[sortField.id];
    const cmp = typeof av === "string" ? (av as string).localeCompare(bv as string) : Number(av) - Number(bv);
    return sortField.desc ? -cmp : cmp;
  });

  // 5. Paginate
  const totalItems = allAgents.length;
  const offset = (page - 1) * perPage;
  return { data: allAgents.slice(offset, offset + perPage), totalItems };
}

export async function getSalesByItem(params: {
  start_date?: string;
  end_date?: string;
  search?: string;
  service_type?: string[];
  page?: number;
  perPage?: number;
  sort?: Array<{ id: string; desc: boolean }>;
}): Promise<{ data: SalesByItem[]; totalItems: number }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], totalItems: 0 };

  const { start_date, end_date, search, service_type, page = 1, perPage = 50, sort } = params;

  // 1. Service rows matching filters
  let viewQuery = supabase
    .from("vw_agent_sales_service_details")
    .select(
      "item_key, service_name, service_type, query_id, adults, children, infants, sale_units, currency, query_total_amount"
    )
    .eq("dmc_id", user.dmc.id)
    .limit(10000);

  if (start_date) viewQuery = viewQuery.gte("entry_date", start_date);
  if (end_date) viewQuery = viewQuery.lte("entry_date", end_date);
  if (service_type?.length) viewQuery = viewQuery.in("service_type", service_type);
  if (search) viewQuery = viewQuery.ilike("service_name", `%${search}%`);

  const { data: serviceRows, error } = await viewQuery;
  if (error) {
    console.error("Error fetching sales by item:", error);
    return { data: [], totalItems: 0 };
  }
  if (!serviceRows?.length) return { data: [], totalItems: 0 };

  // 2. Total service count per query (all services, no type filter) for correct pro-ration denominator
  const queryIds = [...new Set(serviceRows.map((r) => r.query_id))];
  const { data: allSvcRows } = await supabase
    .from("vw_agent_sales_service_details")
    .select("query_id")
    .eq("dmc_id", user.dmc.id)
    .in("query_id", queryIds)
    .limit(50000);

  const svcCountByQuery = new Map<string, number>();
  for (const row of allSvcRows ?? []) {
    svcCountByQuery.set(row.query_id, (svcCountByQuery.get(row.query_id) ?? 0) + 1);
  }

  // 3. Aggregate by item
  const itemMap = new Map<string, SalesByItem>();

  for (const row of serviceRows) {
    const svcCount = svcCountByQuery.get(row.query_id) ?? 1;
    const prorated = Number(row.query_total_amount ?? 0) / svcCount;

    if (!itemMap.has(row.item_key)) {
      itemMap.set(row.item_key, {
        item_id: row.item_key,
        service_name: row.service_name,
        service_type: row.service_type,
        sale_count: 0,
        sale_unit:
          row.service_type === "hotel"
            ? "room nights"
            : row.service_type === "tour"
              ? "tours"
              : row.service_type === "transfer"
                ? "transfers"
                : "services",
        total_adults: 0,
        total_children: 0,
        total_infants: 0,
        total_amount: 0,
        currency: row.currency,
      });
    }
    const agg = itemMap.get(row.item_key)!;
    agg.sale_count += Number(row.sale_units ?? 0);
    agg.total_adults += row.adults ?? 0;
    agg.total_children += row.children ?? 0;
    agg.total_infants += row.infants ?? 0;
    agg.total_amount += prorated;
  }

  const allItems: SalesByItem[] = [...itemMap.values()];

  // 4. Sort
  const sortField = sort?.[0];
  allItems.sort((a, b) => {
    if (!sortField) return b.total_amount - a.total_amount;
    const av = (a as unknown as Record<string, unknown>)[sortField.id];
    const bv = (b as unknown as Record<string, unknown>)[sortField.id];
    const cmp = typeof av === "string" ? (av as string).localeCompare(bv as string) : Number(av) - Number(bv);
    return sortField.desc ? -cmp : cmp;
  });

  // 5. Paginate
  const totalItems = allItems.length;
  const offset = (page - 1) * perPage;
  return { data: allItems.slice(offset, offset + perPage), totalItems };
}

export async function getItemSalesByAgent(
  itemId: string,
  startDate?: string,
  endDate?: string
): Promise<ItemSalesByAgent[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return [];

  // 1. Service rows for this item
  let viewQuery = supabase
    .from("vw_agent_sales_service_details")
    .select(
      "tas_id, agency_name, service_type, query_id, adults, children, infants, sale_units, currency, query_total_amount"
    )
    .eq("dmc_id", user.dmc.id)
    .eq("item_key", itemId)
    .limit(10000);

  if (startDate) viewQuery = viewQuery.gte("entry_date", startDate);
  if (endDate) viewQuery = viewQuery.lte("entry_date", endDate);

  const { data: serviceRows, error } = await viewQuery;
  if (error) {
    console.error("Error fetching item sales by agent:", error);
    return [];
  }
  if (!serviceRows?.length) return [];

  // 2. Total service count per query for pro-ration denominator
  const queryIds = [...new Set(serviceRows.map((r) => r.query_id))];
  const { data: allSvcRows } = await supabase
    .from("vw_agent_sales_service_details")
    .select("query_id")
    .eq("dmc_id", user.dmc.id)
    .in("query_id", queryIds)
    .limit(50000);

  const svcCountByQuery = new Map<string, number>();
  for (const row of allSvcRows ?? []) {
    svcCountByQuery.set(row.query_id, (svcCountByQuery.get(row.query_id) ?? 0) + 1);
  }

  // 3. Aggregate by agent
  const agentMap = new Map<string, ItemSalesByAgent>();

  for (const row of serviceRows) {
    const svcCount = svcCountByQuery.get(row.query_id) ?? 1;
    const prorated = Number(row.query_total_amount ?? 0) / svcCount;

    if (!agentMap.has(row.tas_id)) {
      agentMap.set(row.tas_id, {
        agency_id: row.tas_id,
        agency_name: row.agency_name,
        service_type: row.service_type,
        sale_count: 0,
        sale_unit:
          row.service_type === "hotel"
            ? "room nights"
            : row.service_type === "tour"
              ? "tours"
              : row.service_type === "transfer"
                ? "transfers"
                : "services",
        total_adults: 0,
        total_children: 0,
        total_infants: 0,
        total_amount: 0,
      });
    }
    const agg = agentMap.get(row.tas_id)!;
    agg.sale_count += Number(row.sale_units ?? 0);
    agg.total_adults += row.adults ?? 0;
    agg.total_children += row.children ?? 0;
    agg.total_infants += row.infants ?? 0;
    agg.total_amount += prorated;
  }

  return [...agentMap.values()].sort((a, b) => b.total_amount - a.total_amount);
}

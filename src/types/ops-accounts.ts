import { ItemTypes } from "./suppliers";

export type PaymentPlanType = "agent_receivable" | "supplier_payable";
export type PaymentPlanInstallmentStatus = "unpaid" | "partial" | "paid" | "overdue" | "cancelled";
export type PaymentMethod = "bank_transfer" | "credit_card" | "cash" | "cheque" | "upi" | "other";
export type TransactionType = "payment" | "refund";
export type PaymentLogStatus = "approved" | "pending" | "rejected";

export interface IPaymentPlan {
  id: string;
  query_id: string;
  plan_type: PaymentPlanType;
  supplier_id?: string | null;
  supplier_name?: string | null;
  total_amount: number;
  paid_amount: number;
  currency: string;
  final_due_date?: string | null;
  status: PaymentPlanInstallmentStatus;
  version: number;
  is_active: boolean;
  replaced_by?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IPaymentInstallment {
  id: string;
  payment_plan_id: string;
  installment_number: number;
  installment_amount: number;
  paid_amount: number;
  due_date?: string | null;
  status: PaymentPlanInstallmentStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IPaymentTransaction {
  id: string;
  payment_plan_id: string;
  installment_id?: string | null;
  transaction_type: TransactionType;
  amount: number;
  transaction_date: string;
  payment_method: PaymentMethod;
  transaction_reference?: string | null;
  refund_of_transaction_id?: string | null;
  refund_reason?: string | null;
  approval_status: PaymentLogStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  is_deleted: boolean;
  deleted_by?: string | null;
  deleted_at?: string | null;
  deletion_reason?: string | null;
  notes?: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

export interface IPaymentPlanWithDetails extends IPaymentPlan {
  installments: IPaymentInstallment[];
  transactions?: IPaymentTransaction[];
  booking_count?: number;
  booking_ids?: string[];
  // Fields from vw_whitelabel_payment_plans
  short_query_id?: string | null;
  traveler_name?: string | null;
  agency_name?: string | null;
  remaining_amount?: number | null;
}

// Form input types
export interface ICreatePaymentPlanInput {
  query_id: string;
  plan_type: PaymentPlanType;
  supplier_id?: string | null;
  total_amount: number;
  final_due_date?: string | null;
  currency?: string;
  notes?: string | null;
  installments?: Array<{
    installment_number: number;
    installment_amount: number;
    due_date?: string | null;
    notes?: string | null;
  }>;
  booking_ids?: string[]; // For supplier_payable only
}

export interface IUpdatePaymentPlanInput {
  plan_id: string;
  total_amount: number;
  final_due_date?: string | null;
  currency?: string;
  notes?: string | null;
  installments?: Array<{
    installment_number: number;
    installment_amount: number;
    due_date?: string | null;
    notes?: string | null;
  }>;
}

// ===== GLOBAL VIEW TYPES =====

export interface GlobalPaymentTransaction extends IPaymentTransaction {
  // Flat fields from vw_global_payment_transactions
  plan_type: PaymentPlanType;
  supplier_name: string | null;
  plan_is_active: boolean;
  currency: string;
  query_id: string;
  short_query_id: string;
  traveler_name: string | null;
  dmc_id: string;
  agency_name: string | null;
  receipt_amount: number | null;
  payment_amount: number | null;
}

export interface GlobalAccountsSearchParams {
  tab?: "supplier" | "agent" | "transactions";
  search?: string;
  status?: string[];
  page?: number;
  perPage?: number;
  sort?: Array<{ id: string; desc: boolean }>;
  start_date?: string;
  end_date?: string;
}

// ===== PAYMENT PLAN BASED TYPES =====

export type PaymentPlanStatus =
  | "not_configured" // No payment_plan_id
  | "unpaid" // Plan exists, no payments
  | "partial" // Some payments made
  | "paid" // Fully paid
  | "overdue" // Past due date
  | "cancelled"; // Plan cancelled

export interface ServiceWithPaymentPlan {
  service_id: string;
  payment_plan_id: string | null;
  supplier_id: string;
  supplier_name: string;
  service_name: string;
  package_name?: string | null;
  service_type: ItemTypes;
  cost_price: number;
  currency: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Payment plan fields (null if not configured)
  plan_total_amount: number | null;
  plan_paid_amount: number | null;
  plan_currency: string | null;
  plan_final_due_date: string | null;
  plan_status: string | null;
  plan_version: number | null;
  plan_is_active: boolean | null;
  plan_notes: string | null;
  plan_installments: Omit<IPaymentInstallment, "payment_plan_id" | "created_at" | "updated_at">[];
}

export interface PaymentPlanGroupedRow {
  // Grouping key
  payment_plan_id: string | null; // null = not configured

  // Supplier info
  supplier_id: string;
  supplier_name: string;

  // Service aggregation
  service_names: string[]; // Array of service names for display
  service_count: number;
  services: ServiceWithPaymentPlan[]; // For expansion/details

  // Financial summary
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  currency: string;

  // Payment plan info
  due_date: string | null;
  status: PaymentPlanStatus;
  has_installments: boolean;
  installments: Omit<IPaymentInstallment, "payment_plan_id" | "created_at" | "updated_at">[];
  plan_notes: string | null;

  // UI state
  is_selectable: boolean; // true only if status === 'not_configured'
  is_expandable: boolean; // true if service_count > 1 OR has_installments
}

// =====================================================
// Purchases Types
// =====================================================

export interface PurchaseBySupplier {
  supplier_id: string;
  supplier_name: string;
  supplier_city: string | null;
  supplier_country: string | null;
  service_count: number;
  total_adults: number;
  total_children: number;
  total_infants: number;
  service_types: string[];
  total_amount: number;
  total_paid: number;
  balance: number;
  currency: string;
  total_count?: number;
}

export type SupplierLedgerRowType = "opening_balance" | "purchase" | "payment" | "refund";

export interface SupplierLedgerRow {
  row_date: string | null;
  row_type: SupplierLedgerRowType;
  details: string;
  amount: number;
  payment: number;
  balance: number;
  query_id: string | null;
  service_type: string | null;
}

export interface PurchaseByItem {
  item_id: string;
  service_name: string;
  service_type: string;
  purchase_count: number;
  purchase_unit: string;
  total_adults: number;
  total_children: number;
  total_infants: number;
  total_amount: number;
  currency: string;
  total_count?: number;
}

export interface ItemPurchaseBySupplier {
  supplier_id: string;
  supplier_name: string;
  service_type: string;
  purchase_count: number;
  purchase_unit: string;
  total_adults: number;
  total_children: number;
  total_infants: number;
  total_amount: number;
}

// =====================================================
// Sales Types
// =====================================================

export interface SalesByAgent {
  agency_id: string;
  agency_name: string;
  agency_city: string | null;
  agency_country: string | null;
  agency_address: string | null;
  service_types: string[];
  service_count: number;
  total_adults: number;
  total_children: number;
  total_infants: number;
  total_amount: number;
  currency: string;
  total_count?: number;
}

export type AgentLedgerRowType = "opening_balance" | "sale" | "payment" | "refund";

export interface AgentLedgerRow {
  row_date: string | null;
  row_type: AgentLedgerRowType;
  details: string;
  amount: number;
  payment: number;
  balance: number;
  query_id: string | null;
  service_type: string | null;
}

export interface SalesByItem {
  item_id: string;
  service_name: string;
  service_type: string;
  sale_count: number;
  sale_unit: string;
  total_adults: number;
  total_children: number;
  total_infants: number;
  total_amount: number;
  currency: string;
  total_count?: number;
}

export interface ItemSalesByAgent {
  agency_id: string;
  agency_name: string;
  service_type: string;
  sale_count: number;
  sale_unit: string;
  total_adults: number;
  total_children: number;
  total_infants: number;
  total_amount: number;
}

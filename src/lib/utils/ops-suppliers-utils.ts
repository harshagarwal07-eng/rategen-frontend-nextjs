import { ServiceWithPaymentPlan, PaymentPlanGroupedRow, PaymentPlanStatus } from "@/types/ops-accounts";

/**
 * Groups services by payment_plan_id for the new UI
 * - Services with same payment_plan_id → single grouped row
 * - Services with null payment_plan_id → individual rows (selectable)
 */
export function groupServicesByPaymentPlan(services: ServiceWithPaymentPlan[]): PaymentPlanGroupedRow[] {
  // Separate configured and unconfigured services
  const configured = services.filter((s) => s.payment_plan_id !== null);
  const unconfigured = services.filter((s) => s.payment_plan_id === null);

  // Group configured services by payment_plan_id
  const configuredGroups = new Map<string, ServiceWithPaymentPlan[]>();
  configured.forEach((service) => {
    const key = service.payment_plan_id!;
    if (!configuredGroups.has(key)) {
      configuredGroups.set(key, []);
    }
    configuredGroups.get(key)!.push(service);
  });

  const groupedRows: PaymentPlanGroupedRow[] = [];

  // Add configured groups
  configuredGroups.forEach((groupServices, planId) => {
    const first = groupServices[0];
    const totalAmount = first.plan_total_amount || 0;
    const paidAmount = first.plan_paid_amount || 0;
    const installments = first.plan_installments || [];
    const hasInstallments = installments.length > 0;

    groupedRows.push({
      payment_plan_id: planId,
      supplier_id: first.supplier_id,
      supplier_name: first.supplier_name,
      service_names: groupServices.map((s) => {
        const pkg = s.package_name ? ` (${s.package_name})` : "";
        return `${s.service_name}${pkg}`;
      }),
      service_count: groupServices.length,
      services: groupServices,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      remaining_amount: totalAmount - paidAmount,
      currency: first.plan_currency || "USD",
      due_date: first.plan_final_due_date,
      status: determinePaymentPlanStatus(first.plan_status, paidAmount, totalAmount, first.plan_final_due_date),
      has_installments: hasInstallments,
      installments: installments,
      plan_notes: first.plan_notes,
      is_selectable: false,
      is_expandable: true,
    });
  });

  // Add unconfigured services as individual rows
  unconfigured.forEach((service) => {
    groupedRows.push({
      payment_plan_id: null,
      supplier_id: service.supplier_id,
      supplier_name: service.supplier_name,
      service_names: [`${service.service_name}${service.package_name ? ` (${service.package_name})` : ""}`],
      service_count: 1,
      services: [service],
      total_amount: service.cost_price,
      paid_amount: 0,
      remaining_amount: service.cost_price,
      currency: service.currency || "USD",
      due_date: null,
      status: "not_configured",
      has_installments: false,
      installments: [],
      plan_notes: null,
      is_selectable: true,
      is_expandable: false,
    });
  });

  return groupedRows;
}

/**
 * Determines the display status based on payment plan data
 */
function determinePaymentPlanStatus(
  planStatus: string | null,
  paidAmount: number,
  totalAmount: number,
  dueDate: string | null
): PaymentPlanStatus {
  if (!planStatus) {
    return "not_configured";
  }

  // Check if overdue
  if (dueDate && new Date(dueDate) < new Date()) {
    if (paidAmount < totalAmount) {
      return "overdue";
    }
  }

  // Check payment status
  if (paidAmount === 0) {
    return "unpaid";
  } else if (paidAmount >= totalAmount) {
    return "paid";
  } else {
    return "partial";
  }
}

import type { ServiceBreakup } from "@/data-access/service-breakups";

/**
 * Calculate the total cost for a single breakup row
 */
export function calculateBreakupTotal(breakup: ServiceBreakup): number {
  const baseCost = breakup.base_cost || 0;
  const discount = breakup.discount_amount || 0;
  const markup = breakup.markup_amount || 0;
  const tax = breakup.tax_amount || 0;

  return baseCost - discount + markup + tax;
}

/**
 * Calculate the total base cost across all breakups
 */
export function calculateTotalBaseCost(breakups: ServiceBreakup[]): number {
  return breakups.reduce((sum, breakup) => sum + (breakup.base_cost || 0), 0);
}

/**
 * Calculate the total discount across all breakups
 */
export function calculateTotalDiscount(breakups: ServiceBreakup[]): number {
  return breakups.reduce((sum, breakup) => sum + (breakup.discount_amount || 0), 0);
}

/**
 * Calculate the total markup across all breakups
 */
export function calculateTotalMarkup(breakups: ServiceBreakup[]): number {
  return breakups.reduce((sum, breakup) => sum + (breakup.markup_amount || 0), 0);
}

/**
 * Calculate the total tax across all breakups
 */
export function calculateTotalTax(breakups: ServiceBreakup[]): number {
  return breakups.reduce((sum, breakup) => sum + (breakup.tax_amount || 0), 0);
}

/**
 * Calculate the grand total across all breakups
 */
export function calculateGrandTotal(breakups: ServiceBreakup[]): number {
  return breakups.reduce((sum, breakup) => sum + calculateBreakupTotal(breakup), 0);
}

/**
 * Get the currency from the first breakup (if exists)
 */
export function getBreakupCurrency(breakups: ServiceBreakup[]): string | undefined {
  return breakups.length > 0 && breakups[0].currency ? breakups[0].currency : undefined;
}

/**
 * Validate if a breakup has all required fields for creation
 */
export function isBreakupValid(breakup: ServiceBreakup): boolean {
  return !!(
    breakup.service_name &&
    breakup.service_type &&
    breakup.currency &&
    breakup.chat_id &&
    breakup.message_id
  );
}

/**
 * Create a new empty breakup with default values
 */
export function createEmptyBreakup(
  chatId: string,
  messageId: string,
  activityId: string,
  serviceType: "hotel" | "tour" | "transfer" | "combo" | "meal" | "other",
  defaultCurrency?: string
): Partial<ServiceBreakup> {
  return {
    id: `temp-${Date.now()}`,
    chat_id: chatId,
    message_id: messageId,
    activity_id: activityId,
    service_type: serviceType,
    service_name: "",
    quantity: 1,
    base_cost: 0,
    discount_amount: 0,
    markup_amount: 0,
    tax_amount: 0,
    final_cost: 0,
    currency: defaultCurrency || "USD",
    created_at: new Date().toISOString(),
  };
}

/**
 * Check if a breakup is a temporary (unsaved) breakup
 */
export function isTempBreakup(breakup: ServiceBreakup): boolean {
  return typeof breakup.id === "string" && breakup.id.startsWith("temp-");
}

export type PricingBreakupRule =
  | "total_gross"
  | "category_breakup"
  | "item_breakup";

export interface BankDetail {
  id: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code?: string; // For India
  swift_code?: string; // For international
  iban?: string; // For Europe
  routing_number?: string; // For US
  branch_name?: string;
  branch_address?: string;
  currency: string;
  is_primary: boolean;
}

export interface DMCSettings {
  pricing_breakup_rule: PricingBreakupRule;
  output_currency: string;
  chatdmc_listing: boolean;
  kill_switch: boolean;
  allow_individual_service_rates: boolean;
  bank_details: BankDetail[];
}

export interface UpdateDMCSettingsInput {
  pricing_breakup_rule?: PricingBreakupRule;
  output_currency?: string;
  chatdmc_listing?: boolean;
  kill_switch?: boolean;
  allow_individual_service_rates?: boolean;
  bank_details?: BankDetail[];
}

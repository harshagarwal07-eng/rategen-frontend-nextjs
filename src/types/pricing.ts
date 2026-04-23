/**
 * Centralized Pricing Types
 *
 * Re-exports all pricing-related types from pricing utilities
 * and adds composite types for the complete pricing breakdown
 */

// Re-export date utilities types
export type {
  DateRange,
} from '@/lib/pricing/date-utils';

// Re-export child policy types
export type {
  ChildPolicyRule,
} from '@/lib/pricing/child-policy-parser';

// Re-export hotel pricing types
export type {
  HotelSeason,
  HotelRoom,
  HotelPricingInput,
  SeasonBreakdown,
  HotelPricingBreakdown,
} from '@/lib/pricing/hotel-pricing';

// Re-export tour pricing types
export type {
  TourVehicle,
  TourSeason,
  TourAddon,
  TourPackage,
  TourPricingInput,
  TourPricingBreakdown,
} from '@/lib/pricing/tour-pricing';

// Re-export transfer pricing types
export type {
  TransferVehicle,
  TransferSeason,
  TransferPackage,
  TransferPricingInput,
  TransferPricingBreakdown,
} from '@/lib/pricing/transfer-pricing';

/**
 * Complete pricing breakdown for a full quote
 * Includes hotels, tours, transfers, and grand total
 */
export interface CompletePricingBreakdown {
  hotels: HotelPricingBreakdown[];
  tours: TourPricingBreakdown[];
  transfers: TransferPricingBreakdown[];
  grand_total: number;
  primary_currency: string; // From DMC settings
}

/**
 * Pricing calculation error
 */
export interface PricingError {
  service_type: 'hotel' | 'tour' | 'transfer';
  service_name: string;
  error_message: string;
  partial_data?: Partial<HotelPricingBreakdown | TourPricingBreakdown | TransferPricingBreakdown>;
}

/**
 * Pricing calculation result with potential errors
 * As per decision #18: Show partial quote with error note
 */
export interface PricingResult {
  breakdown: CompletePricingBreakdown;
  errors: PricingError[];
  has_errors: boolean;
}

// Import the types for re-export
import type { HotelPricingBreakdown } from '@/lib/pricing/hotel-pricing';
import type { TourPricingBreakdown } from '@/lib/pricing/tour-pricing';
import type { TransferPricingBreakdown } from '@/lib/pricing/transfer-pricing';

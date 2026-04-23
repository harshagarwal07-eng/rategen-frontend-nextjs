import type { TransferActivity } from "@/data-access/itinerary-activities";
import type { ServiceBreakup } from "@/data-access/service-breakups";
import type { Season, TransferType, TransferAddOn, TRANSFER_TYPE_GROUPS } from "@/types/transfers";

// Age policy structure (same as tours)
export type AgePolicy = {
  infant?: { min_age: number; max_age: number };
  child?: { min_age: number; max_age: number };
  teenager?: { min_age: number; max_age: number };
  adult?: { min_age: number };
};

export interface TransferFormData extends Partial<TransferActivity> {
  allActivityIds?: string[];
}

export interface TransferDetails {
  id?: string;
  transfer_name?: string;
  package_name?: string;
  package_description?: string;
  city?: string;
  country?: string;
  transfer_mode?: string;
  transfer_type?: TransferType[];
  is_sic?: boolean;
  pickup_date?: string;
  pickup_time?: string;
  pickup_point?: string;
  drop_date?: string;
  drop_time?: string;
  drop_point?: string;
  meeting_point?: string;
  duration_hours?: number;
  duration_days?: number;
  distance_km?: number;
  inclusions?: string;
  exclusions?: string;
  cancellation_policy?: string;
  agency_cancellation_policy?: string;
  age_policy?: AgePolicy;
  seasons?: Season[];
  add_ons?: TransferAddOn[];
  images?: string[];
  notes?: string;
  remarks?: string;
  currency?: string;
}

export interface ItineraryInfo {
  nights: number;
  checkIn: string; // YYYY-MM-DD
}

export interface TransferSheetContextValue {
  formData: TransferFormData;
  transferDetails: TransferDetails | null;
  breakups: ServiceBreakup[];
  saving: boolean;
  hasChanges: boolean;
  itineraryInfo: ItineraryInfo | null;
  updateFormField: <K extends keyof TransferActivity>(field: K, value: TransferActivity[K]) => void;
  updateBreakupField: (id: string, field: string, value: any) => void;
  addBreakup: () => Promise<void>;
  deleteBreakup: (id: string) => Promise<void>;
  handleSave: () => Promise<void>;
  handleSaveBreakups: () => Promise<void>;
}

// Manual transfer form data (string inputs for form)
export interface ManualTransferFormData {
  // Transfer info
  transfer_name: string;
  transfer_city: string;
  transfer_country: string;
  package_description: string;
  transfer_mode: TransferMode;
  // Currency
  currency: string;
  // Images
  images: string[];
  // Booking details - common
  pickup_date: string;
  pickup_time: string;
  pickup_point: string;
  drop_date: string;
  drop_time: string;
  drop_point: string;
  meeting_point: string;
  transfer_type: string[];
  is_sic: boolean;
  // Vehicle mode specific
  duration_hours: string;
  // Vehicle on Disposal mode specific
  duration_days: string;
  distance_km: string;
  // Add-ons
  add_ons: Array<{
    name: string;
    adult_rate: string;
    child_rate: string;
    is_mandatory: boolean;
  }>;
  // Notes
  notes: string;
  // Policies
  inclusions: string;
  exclusions: string;
  cancellation_policy: string;
  agency_cancellation_policy: string;
  // Age Policy
  infant_min_age: string;
  infant_max_age: string;
  child_min_age: string;
  child_max_age: string;
  teen_min_age: string;
  teen_max_age: string;
  adult_min_age: string;
  // Seasons
  seasons: Array<{
    dates: string;
    sic_adult: string;
    sic_child: string;
    pvt_rates: Array<{
      vehicle_type: string;
      capacity: string;
      rate: string;
    }>;
  }>;
}

// Output data structure for saving
export interface ManualTransferData {
  library_item_id?: string;
  // Transfer info
  transfer_name: string;
  transfer_city?: string;
  transfer_country?: string;
  package_description?: string;
  transfer_mode?: TransferMode;
  // Currency
  currency?: string;
  // Images
  images?: string[];
  // Booking details
  pickup_date?: string;
  pickup_time?: string;
  pickup_point?: string;
  drop_date?: string;
  drop_time?: string;
  drop_point?: string;
  meeting_point?: string;
  transfer_type?: string[];
  is_sic?: boolean;
  duration_hours?: number;
  duration_days?: number;
  distance_km?: number;
  // Add-ons
  add_ons?: Array<{
    name: string;
    adult_rate?: number;
    child_rate?: number;
    is_mandatory?: boolean;
  }>;
  // Notes
  notes?: string;
  // Policies
  inclusions?: string;
  exclusions?: string;
  cancellation_policy?: string;
  agency_cancellation_policy?: string;
  // Age Policy
  age_policy?: AgePolicy;
  // Seasons
  seasons?: Season[];
}

// Transfer modes
export type TransferMode = "vehicle" | "vehicle_disposal" | "ferry" | "rail" | "helicopter";

export const TRANSFER_MODES = [
  { value: "vehicle", label: "Vehicle" },
  { value: "vehicle_disposal", label: "Vehicle on Disposal" },
  { value: "ferry", label: "Ferry" },
  { value: "rail", label: "Rail" },
  { value: "helicopter", label: "Helicopter" },
] as const;

// Re-export from transfers types
export { TRANSFER_TYPE_GROUPS } from "@/types/transfers";

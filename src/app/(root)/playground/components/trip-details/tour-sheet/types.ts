import type { TourActivity } from "@/data-access/itinerary-activities";
import type { ServiceBreakup } from "@/data-access/service-breakups";
import type { AgePolicy, TourSeason, TourAddOn, Duration, OperationalHours } from "@/types/tours";

export interface TourFormData extends Partial<TourActivity> {
  // Aggregated from multiple activities (if needed)
  allActivityIds?: string[];
}

export interface TourDetails {
  id?: string;
  tour_name?: string;
  package_name?: string;
  package_description?: string;
  city?: string;
  country?: string;
  categories?: string[];
  duration?: Duration;
  operational_hours?: OperationalHours[];
  tour_type?: "ticket_only" | "sic" | "pvt";
  includes_transfer?: boolean;
  meeting_point?: string;
  pickup_point?: string;
  dropoff_point?: string;
  inclusions?: string;
  exclusions?: string;
  cancellation_policy?: string;
  agency_cancellation_policy?: string;
  age_policy?: AgePolicy;
  seasons?: TourSeason[];
  add_ons?: TourAddOn[];
  images?: string[];
  notes?: string;
  remarks?: string;
  currency?: string;
}

export interface ItineraryInfo {
  nights: number;
  checkIn: string; // YYYY-MM-DD
}

export interface TourSheetContextValue {
  formData: TourFormData;
  tourDetails: TourDetails | null;
  breakups: ServiceBreakup[];
  saving: boolean;
  hasChanges: boolean;
  itineraryInfo: ItineraryInfo | null;
  updateFormField: <K extends keyof TourActivity>(field: K, value: TourActivity[K]) => void;
  updateBreakupField: (id: string, field: string, value: any) => void;
  addBreakup: () => Promise<void>;
  deleteBreakup: (id: string) => Promise<void>;
  handleSave: () => Promise<void>;
  handleSaveBreakups: () => Promise<void>;
}

// Manual tour form data (string inputs for form)
export interface ManualTourFormData {
  // Tour info
  tour_name: string;
  tour_city: string;
  tour_country: string;
  package_description: string;
  categories: string[];
  // Currency
  currency: string;
  // Images
  images: string[];
  // Booking details
  operational_hours: Array<{
    day: string;
    time_start: string;
    time_end: string;
  }>;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  duration_days: string;
  duration_hours: string;
  duration_minutes: string;
  tour_type: "ticket_only" | "sic" | "pvt";
  includes_transfer: boolean;
  meeting_point: string;
  pickup_point: string;
  dropoff_point: string;
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
    ticket_only_adult: string;
    ticket_only_child: string;
    ticket_only_infant: string;
    ticket_only_teen: string;
    sic_adult: string;
    sic_child: string;
    pvt_rates: Array<{
      vehicle_type: string;
      rate: string;
    }>;
  }>;
}

// Output data structure for saving
export interface ManualTourData {
  library_item_id?: string;
  // Tour info
  tour_name: string;
  tour_city?: string;
  tour_country?: string;
  package_description?: string;
  categories?: string[];
  // Currency
  currency?: string;
  // Images
  images?: string[];
  // Booking details
  operational_hours?: OperationalHours[];
  start_date?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  duration?: Duration;
  tour_type?: "ticket_only" | "sic" | "pvt";
  includes_transfer?: boolean;
  meeting_point?: string;
  pickup_point?: string;
  dropoff_point?: string;
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
  seasons?: TourSeason[];
}

// Tour categories for multi-select
export const TOUR_CATEGORIES = [
  { value: "adventure", label: "Adventure" },
  { value: "cultural", label: "Cultural" },
  { value: "nature", label: "Nature" },
  { value: "beach", label: "Beach" },
  { value: "city", label: "City" },
  { value: "wildlife", label: "Wildlife" },
  { value: "water_sports", label: "Water Sports" },
  { value: "food", label: "Food & Culinary" },
  { value: "historical", label: "Historical" },
  { value: "family", label: "Family" },
  { value: "romantic", label: "Romantic" },
  { value: "luxury", label: "Luxury" },
  { value: "budget", label: "Budget" },
  { value: "spiritual", label: "Spiritual" },
  { value: "shopping", label: "Shopping" },
] as const;

export const TOUR_TYPES = [
  { value: "ticket_only", label: "Ticket Only" },
  { value: "sic", label: "SIC (Seat-in-Coach)" },
  { value: "pvt", label: "Private Transfer" },
] as const;

export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

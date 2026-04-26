export interface FDSearchCity {
  id: string;
  name: string;
}

export interface FDSearchCountry {
  id: string;
  name: string;
}

export interface FDSearchDeparture {
  id: string;
  departure_date: string;
  return_date: string;
  seats_available: number;
  availability_status: string;
}

export interface FDSearchPackage {
  id: string;
  name: string;
  tour_code: string | null;
  main_image_url: string | null;
  duration_nights: number;
  age_restriction: boolean;
  min_age: number | null;
  max_age: number | null;
  currency: string | null;
  cities: FDSearchCity[];
  countries: FDSearchCountry[];
  supplier: { id: string; name: string; logo_url: string | null };
  from_price: number | null;
  matching_departures: FDSearchDeparture[];
  total_matching_departures: number;
}

export interface FDSearchResponse {
  packages: FDSearchPackage[];
}

export interface FDSearchFilterOptions {
  cities_with_packages: { id: string; name: string; country_name: string }[];
  departure_cities: string[];
  suppliers: { id: string; name: string }[];
}

export interface FDPublicAgePolicy {
  id: string;
  band_name: string;
  age_from: number | null;
  age_to: number | null;
  band_order: number;
}

export interface FDPublicItineraryDay {
  id: string;
  day_number: number;
  title: string | null;
  description: string | null;
  meals_included: string | null;
  image_url: string | null;
  overnight_city: string | null;
  accommodation_note: string | null;
  includes: string | null;
}

export interface FDPublicAddon {
  id: string;
  name: string;
  description: string | null;
  addon_type: string | null;
  is_mandatory: boolean;
  duration_days: number | null;
  price_adult: number | null;
  price_child: number | null;
  price_infant: number | null;
  price_teen: number | null;
  price_unit: string | null;
  max_capacity: number | null;
  fd_addon_itinerary_days: FDPublicItineraryDay[];
}

export interface FDPublicFlight {
  id: string;
  flight_group: string;
  flight_type: "outbound" | "inbound" | "internal";
  airline: string | null;
  origin_city: string | null;
  origin_airport: string | null;
  destination_city: string | null;
  destination_airport: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  is_direct: boolean;
  sort_order: number;
}

export interface FDPublicVisa {
  id: string;
  visa_included: boolean;
  visa_type: string | null;
  price_adult: number | null;
  price_child: number | null;
  price_infant: number | null;
  price_teen: number | null;
  notes: string | null;
  insurance_included: boolean;
  insurance_price_adult: number | null;
  insurance_notes: string | null;
}

export interface FDPublicDeparturePricing {
  id: string;
  pricing_type: string;
  rate_single: number | null;
  rate_double: number | null;
  rate_triple: number | null;
  rate_teen: number | null;
  rate_child_no_bed: number | null;
  rate_child_extra_bed: number | null;
  rate_infant: number | null;
}

export interface FDPublicCancellationRule {
  id: string;
  days_from: number;
  days_to: number;
  penalty_pct: number | null;
  sort_order: number;
}

export interface FDPublicPaymentScheduleItem {
  id: string;
  label: string | null;
  days_from: number | null;
  days_to: number | null;
  amount_pct: number | null;
  sort_order: number;
}

export interface FDPublicDeparture {
  id: string;
  departure_date: string;
  return_date: string;
  cutoff_date: string;
  total_seats: number;
  seats_sold: number;
  seats_on_hold: number;
  seats_available: number;
  min_pax: number;
  max_pax: number | null;
  departure_status: string;
  availability_status: string;
  is_guaranteed: boolean;
  fd_departure_pricing: FDPublicDeparturePricing[];
  fd_cancellation_policy: FDPublicCancellationRule[];
  fd_payment_schedule: FDPublicPaymentScheduleItem[];
}

export interface FDPublicPackage {
  id: string;
  name: string;
  description: string | null;
  main_image_url: string | null;
  banner_image_url: string | null;
  duration_nights: number;
  age_restriction: boolean;
  min_age: number | null;
  max_age: number | null;
  max_group_size: number | null;
  tour_code: string | null;
  departure_city: string | null;
  currency: string | null;
  supplier_id: string;
  status: string;
  flights_included: boolean;
  flights_inclusion: string | null;
  visa_inclusion: string | null;
  terms_and_conditions: string | null;
  payment_policy: string | null;
  refund_policy: string | null;
  inc_hotels: string | null;
  inc_meals: string | null;
  inc_guide: string | null;
  inc_tours: string | null;
  inc_transfers: string | null;
  inc_taxes: string | null;
  inc_visa: string | null;
  inc_other: string | null;
  exc_hotels: string | null;
  exc_meals: string | null;
  exc_guide: string | null;
  exc_tours: string | null;
  exc_transfers: string | null;
  exc_taxes: string | null;
  exc_visa: string | null;
  exc_other: string | null;
  fd_itinerary_days: FDPublicItineraryDay[];
  fd_age_policies: FDPublicAgePolicy[];
  fd_addons: FDPublicAddon[];
  fd_flights: FDPublicFlight[];
  fd_visa: FDPublicVisa | null;
  fd_taxes: unknown[];
  cities: FDSearchCity[];
  countries: FDSearchCountry[];
  departures: FDPublicDeparture[];
}

export type FDSortKey =
  | "price-asc"
  | "price-desc"
  | "duration-asc"
  | "duration-desc"
  | "departure-asc";

export interface FDSearchQuery {
  cities?: string;
  months?: string;
  departureCity?: string;
  ageGroups?: string;
  durations?: string;
  sort?: FDSortKey;
}

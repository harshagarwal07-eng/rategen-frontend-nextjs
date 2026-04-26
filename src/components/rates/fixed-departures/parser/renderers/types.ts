// Shapes of the parsed outputs the fd-parser backend emits in
// stage_outputs[<stage>]. Mirrors what the agent prompts write; all
// fields are permissively typed because the parser is LLM-backed and
// fields can be omitted / null. Renderers consume these.

export interface ItineraryDay {
  day_number: number | null;
  title: string | null;
  country: string | null;
  overnight_city: string | null;
  meals_included: string | null;
  includes: string | null;
  description: string | null;
  accommodation_note: string | null;
}

export interface ItineraryOutput {
  countries?: string[];
  cities?: string[];
  departure_city?: string | null;
  departure_city_country?: string | null;
  description?: string | null;
  days?: ItineraryDay[];
}

export interface InclusionsExclusionsOutput {
  inc_hotels?: string | null;
  inc_meals?: string | null;
  inc_guide?: string | null;
  inc_tours?: string | null;
  inc_transfers?: string | null;
  inc_taxes?: string | null;
  inc_visa?: string | null;
  inc_other?: string | null;
  exc_hotels?: string | null;
  exc_meals?: string | null;
  exc_guide?: string | null;
  exc_tours?: string | null;
  exc_transfers?: string | null;
  exc_taxes?: string | null;
  exc_visa?: string | null;
  exc_other?: string | null;
}

export interface DeparturePricing {
  pricing_type?: string | null;
  rate_single?: number | null;
  rate_double?: number | null;
  rate_triple?: number | null;
  rate_child_extra_bed?: number | null;
  rate_child_no_bed?: number | null;
  rate_teen?: number | null;
  rate_infant?: number | null;
}

export interface Departure {
  departure_date: string;
  return_date?: string | null;
  cutoff_date?: string | null;
  total_seats?: number | null;
  min_pax?: number | null;
  max_pax?: number | null;
  departure_status?: string | null;
  availability_status?: string | null;
  pricing?: DeparturePricing | null;
}

export interface DeparturesPricingOutput {
  currency?: string | null;
  age_policy_note?: string | null;
  ai_flags?: string[];
  departures?: Departure[];
}

export interface Addon {
  name?: string | null;
  description?: string | null;
  addon_type?: string | null;
  duration_days?: number | null;
  price_unit?: string | null;
  is_mandatory?: boolean | null;
  price_on_request?: boolean | null;
  price_adult?: number | null;
  price_child?: number | null;
  price_teen?: number | null;
  price_infant?: number | null;
  inclusions?: string | null;
  exclusions?: string | null;
  itinerary_days?: Array<Record<string, unknown>> | null;
  departure_pricing?: Array<Record<string, unknown>> | null;
}

export interface AddonsOutput {
  addons?: Addon[];
}

export interface Flight {
  flight_group?: string | null;
  flight_type?: string | null;
  airline?: string | null;
  origin_city?: string | null;
  origin_airport?: string | null;
  destination_city?: string | null;
  destination_airport?: string | null;
  departure_time?: string | null;
  arrival_time?: string | null;
  is_direct?: boolean | null;
  is_included?: boolean | null;
  price_on_request?: boolean | null;
  stops?: unknown[];
  pricing?: Record<string, unknown> | null;
}

export interface Visa {
  visa_included?: boolean | null;
  visa_type?: string | null;
  notes?: string | null;
  price_adult?: number | null;
  price_child?: number | null;
  price_teen?: number | null;
  price_infant?: number | null;
}

export interface Insurance {
  insurance_included?: boolean | null;
  insurance_notes?: string | null;
  insurance_price_adult?: number | null;
  insurance_price_child?: number | null;
  insurance_price_teen?: number | null;
  insurance_price_infant?: number | null;
}

export interface Tax {
  name?: string | null;
  amount?: number | null;
  value_type?: string | null;
  basis?: string | null;
  included?: boolean | null;
}

export interface FlightsVisaTaxesOutput {
  flights?: Flight[];
  visa?: Visa | null;
  insurance?: Insurance | null;
  taxes?: Tax[];
  flights_included_top_level?: boolean;
}

export interface CancellationRule {
  days_from?: number | null;
  days_to?: number | null;
  date_basis?: string | null;
  value_type?: string | null;
  penalty_pct?: number | null;
  penalty_adult?: number | null;
  penalty_child?: number | null;
  penalty_infant?: number | null;
  sort_order?: number | null;
}

export interface PaymentScheduleItem {
  label?: string | null;
  days_from?: number | null;
  days_to?: number | null;
  date_basis?: string | null;
  value_type?: string | null;
  amount_pct?: number | null;
  amount_adult?: number | null;
  amount_child?: number | null;
  amount_infant?: number | null;
  sort_order?: number | null;
}

export interface PoliciesOutput {
  cancellation_rules?: CancellationRule[];
  payment_schedule?: PaymentScheduleItem[];
  refund_policy?: string | null;
  payment_policy?: string | null;
  terms_and_conditions?: string | null;
}

export interface DayImage {
  day_number: number;
  image_url: string;
  source: "pexels" | "unsplash" | null;
  search_query?: string | null;
  download_location?: string | null;
}

export interface AutoImagesOutput {
  banner_image_url?: string | null;
  banner_source?: string | null;
  banner_search_query?: string | null;
  banner_download_location?: string | null;
  day_images?: DayImage[];
  errors?: unknown[];
}

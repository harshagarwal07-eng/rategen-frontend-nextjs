export type PassengerType = "adult" | "child" | "infant";
export type Title = "Mr" | "Mrs" | "Ms" | "Dr" | "Master";
export type Gender = "male" | "female" | "other";
export type DietaryPreference = "none" | "vegetarian" | "indian_veg" | "vegan" | "jain" | "halal" | "kosher" | "other";
export type BedType = "king" | "queen" | "twin";
export type FlightType = "arrival" | "departure" | "internal";
export type DocumentCategory = "passport" | "visa" | "flight_ticket" | "insurance" | "wedding_cert" | "medical_cert" | "other";

export interface GuestDetail {
  guest_id?: string; // tracks the travel_agent_guest_details row id
  type: PassengerType;
  title: Title;
  first_name: string;
  last_name: string;
  gender: Gender;
  date_of_birth: string;
  nationality: string;
  nationality_name?: string; // Store country name for display
  nationality_code?: string; // 2-letter ISO code for flag display
  passport_number: string;
  passport_issue_date: string;
  passport_expiry: string;
  contact_mobile?: string;
  room_assignment?: number;

  dietary_preference?: string;
  dietary_custom?: string;
  food_allergies?: string;
  medical_restrictions?: string;
  bed_type?: string;
  smoking?: boolean;
  medical_conditions?: string;
  mobility_assistance?: string;
}

export interface ArrivalDeparture {
  type: FlightType;
  from: string;
  to: string;
  arrival_date: string;
  arrival_time: string;
  dept_date: string;
  dept_time: string;
  airline: string;
  flight_no: string;
  passenger_ids?: string[]; // Optional guest associations
}

export interface Preference {
  interconnecting_rooms?: boolean;
  special_room_requests?: string;

  luggage_checkin?: number;
  luggage_cabin?: number;
  oversized_luggage?: boolean;
  child_seat_required?: boolean;
  child_seat_count?: number;

  honeymoon?: boolean;
  anniversary?: boolean;
  birthday?: boolean;
  other_requests?: string;
}

export interface DocumentFile {
  url: string;
  name: string;
  type: string;
  category?: DocumentCategory;
  passenger_id?: string;
  notes?: string;
}

export interface Questionnaire {
  id: string;
  created_at: string;
  updated_at: string;
  q_id: string;
  arrival_and_departure: ArrivalDeparture[];
  preferences: Preference[];
  documents: DocumentFile[];
}

import { SearchParams } from "./common";

export interface DatastoreSearchParams extends SearchParams {
  tour_name: string | null;
  transfer_name: string | null;
  title: string | null; // for comobos
  meal_name?: string | null;
  hotel_name: string | null;
  "car on disposal"?: string;
  country: string[];
  state: string[];
  city: string[];
  guide_type: string[];
  currency: string[];
}

export interface DmcContract {
  id: string;
  dmc_id: string;
  dmc_hotel_id: string;
  market_id: string | null;
  name: string;
  stay_valid_from: string | null;
  stay_valid_till: string | null;
  booking_valid_from: string | null;
  booking_valid_till: string | null;
  status: "draft" | "active" | "archived";
  rate_type: "net" | "bar" | null;
  default_availability: number | null;
  created_at: string;
  market?: { id: string; name: string } | null;
}

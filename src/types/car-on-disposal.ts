export interface CarOnDisposal {
  id?: string;
  name: string;
  brand: string;
  country: string;
  currency: string;
  capacity: number;
  description: string;
  route: string;
  rate_per_km: number;
  min_km_per_day: number;
  max_hrs_per_day: number;
  surcharge_per_hr: number;
  vbp_rate: number;
  vbp_max_hrs_per_day: number;
  vbp_surcharge_per_hr: number;
  vbp_max_km_per_day: number;
  vbp_surcharge_per_km: number;
  images: string[];
  cancellation_policy: string;
  remarks: string;
  examples: string;
  created_at: string;
  dmc_id?: string;
  preferred: boolean;
  markup: number;
}

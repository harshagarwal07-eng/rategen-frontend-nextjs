export interface Guide {
  id?: string;
  guide_type: string;
  currency: string;
  description: string;
  per_day_rate: number;
  language: string;
  cancellation_policy: string;
  images: string[];
  remarks: string;
  dmc_id?: string;
  country: string; // UUID
  created_at: string;
  examples: string;
  preferred: boolean;
  markup: number;
}

export interface Meal {
  id?: string;
  meal_name: string;
  currency: string;
  description: string;
  meal_rate_adult: number;
  meal_rate_child: number;
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

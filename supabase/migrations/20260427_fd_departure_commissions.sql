-- Per-departure agency commission feature.
--
-- Toggles live on fd_departure_dates so a single SELECT * on the departure
-- gives us the four flags without a join. The fd_departure_commissions table
-- holds up to 6 rows per departure: { land, flight } × { adult, child, infant }.
-- Rows persist across is_commissionable toggle so values aren't lost on toggle-off.

ALTER TABLE fd_departure_dates
  ADD COLUMN IF NOT EXISTS is_commissionable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS apply_land_commission_to_addons boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS room_sharing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS same_gender_sharing boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS fd_departure_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_date_id uuid NOT NULL REFERENCES fd_departure_dates(id) ON DELETE CASCADE,
  component text NOT NULL CHECK (component IN ('land', 'flight')),
  age_band text NOT NULL CHECK (age_band IN ('adult', 'child', 'infant')),
  commission_type text NOT NULL CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (departure_date_id, component, age_band)
);

CREATE INDEX IF NOT EXISTS idx_fd_departure_commissions_dep
  ON fd_departure_commissions (departure_date_id);

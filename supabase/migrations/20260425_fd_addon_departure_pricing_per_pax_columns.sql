-- Add per-pax / single-rate override columns to fd_addon_departure_pricing.
-- Addon pricing in Tab 4 is per-pax (Adult / Child / Infant) or single-rate
-- (Total). The existing occupancy columns (Single / Double / Triple / Child
-- No Bed / Child Extra Bed / Infant) are kept for backward compat — nothing
-- is in production yet, so we just leave them unused for now.
ALTER TABLE fd_addon_departure_pricing
  ADD COLUMN IF NOT EXISTS override_price_adult numeric,
  ADD COLUMN IF NOT EXISTS override_price_child numeric,
  ADD COLUMN IF NOT EXISTS override_price_infant numeric,
  ADD COLUMN IF NOT EXISTS override_price_total numeric;

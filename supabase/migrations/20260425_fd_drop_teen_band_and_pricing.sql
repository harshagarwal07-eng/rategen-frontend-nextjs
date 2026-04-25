-- Drop the Teen age band across all FD tables. Age bands are now 3: Infant, Child, Adult.
-- fd_age_policies.band_name is stored mixed-case ("Teen" in current data) — match case-insensitive for safety.

DELETE FROM fd_age_policies WHERE lower(band_name) = 'teen';

ALTER TABLE fd_departure_pricing       DROP COLUMN IF EXISTS rate_teen;
ALTER TABLE fd_addon_departure_pricing DROP COLUMN IF EXISTS rate_teen;
ALTER TABLE fd_flight_pricing          DROP COLUMN IF EXISTS price_teen;

ALTER TABLE fd_addons
  DROP COLUMN IF EXISTS price_teen,
  DROP COLUMN IF EXISTS custom_teen_age_from,
  DROP COLUMN IF EXISTS custom_teen_age_to;

ALTER TABLE fd_visa
  DROP COLUMN IF EXISTS price_teen,
  DROP COLUMN IF EXISTS insurance_price_teen,
  DROP COLUMN IF EXISTS custom_teen_age_from,
  DROP COLUMN IF EXISTS custom_teen_age_to;

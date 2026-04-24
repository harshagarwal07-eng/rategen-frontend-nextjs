ALTER TABLE fd_packages
  DROP COLUMN IF EXISTS countries,
  DROP COLUMN IF EXISTS cities,
  DROP COLUMN IF EXISTS departure_city;

-- Lock down enum values used by the Tab 5 — Departure Dates UI.
-- Both columns remain nullable (legacy data may have NULLs); CHECK only
-- restricts non-NULL values to the canonical UI set.

ALTER TABLE public.fd_departure_dates
  ADD CONSTRAINT fd_departure_dates_departure_status_check
  CHECK (departure_status IS NULL OR departure_status IN ('planned', 'confirmed', 'cancelled'));

ALTER TABLE public.fd_departure_dates
  ADD CONSTRAINT fd_departure_dates_availability_status_check
  CHECK (availability_status IS NULL OR availability_status IN ('available', 'limited', 'sold_out'));

-- ============================================================
-- Trigger: fire Edge Function when a booking → 'confirmed'
-- Replaces the earlier query-status trigger approach.
-- Uses pg_net to POST asynchronously (non-blocking).
--
-- Settings are stored in app_config table (no superuser needed).
-- Seed the config after running this migration:
--   INSERT INTO app_config (key, value) VALUES
--     ('supabase_url', 'https://<project>.supabase.co'),
--     ('service_role_key', '<service_role_key>')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
-- ============================================================

-- Config table for trigger-accessible settings
CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Only postgres/service_role can read/write
REVOKE ALL ON app_config FROM anon, authenticated;

-- Drop old query-status trigger if it exists
DROP TRIGGER IF EXISTS on_query_booked ON whitelabel_queries;
DROP FUNCTION IF EXISTS notify_query_booked();

-- New trigger function on whitelabel_bookings
CREATE OR REPLACE FUNCTION notify_booking_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_url    TEXT;
  service_key TEXT;
  v_query_id  UUID;
  v_dmc_id    UUID;
BEGIN
  IF NEW.booking_status = 'confirmed' AND (OLD.booking_status IS DISTINCT FROM 'confirmed') THEN

    v_query_id := NEW.query_id;

    SELECT dmc_id INTO v_dmc_id
    FROM whitelabel_queries
    WHERE id = v_query_id;

    IF v_dmc_id IS NULL THEN
      RAISE WARNING 'notify_booking_confirmed: could not resolve dmc_id for query_id=%', v_query_id;
      RETURN NEW;
    END IF;

    SELECT value INTO edge_url    FROM app_config WHERE key = 'supabase_url';
    SELECT value INTO service_key FROM app_config WHERE key = 'service_role_key';

    IF edge_url IS NULL OR service_key IS NULL THEN
      RAISE WARNING 'notify_booking_confirmed: app_config missing supabase_url or service_role_key — skipping booking_id=%', NEW.id;
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url     := edge_url || '/functions/v1/auto-generate-supplier-drafts',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body    := jsonb_build_object(
        'query_id',   v_query_id::text,
        'dmc_id',     v_dmc_id::text,
        'booking_id', NEW.id::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_confirmed ON whitelabel_bookings;

CREATE TRIGGER on_booking_confirmed
  AFTER UPDATE OF booking_status ON whitelabel_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_confirmed();

COMMENT ON FUNCTION notify_booking_confirmed() IS
  'Fires when a booking transitions to confirmed. '
  'Calls auto-generate-supplier-drafts Edge Function via pg_net. '
  'Reads supabase_url and service_role_key from the app_config table.';

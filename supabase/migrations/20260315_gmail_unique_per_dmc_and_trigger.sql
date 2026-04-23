-- ============================================================
-- Part 1: Fix Gmail connections to be unique per DMC (not user)
-- Each DMC has exactly one Gmail connection used for all ops emails
-- ============================================================

-- Drop the user-level unique constraint
ALTER TABLE public.user_gmail_connections
  DROP CONSTRAINT IF EXISTS user_gmail_connections_user_id_key;

-- Add DMC-level unique constraint
ALTER TABLE public.user_gmail_connections
  ADD CONSTRAINT user_gmail_connections_dmc_id_key UNIQUE (dmc_id);

-- Update RLS: allow DMC members to read their DMC's Gmail connection
-- (needed for Edge Function service role access; write still scoped to owner)
CREATE POLICY "dmc_members_can_read_gmail_connection"
  ON public.user_gmail_connections
  FOR SELECT
  USING (
    dmc_id IN (
      SELECT dmc_id FROM profile WHERE user_id = auth.uid()
    )
  );


-- ============================================================
-- Part 2: DB trigger — fire Edge Function when query → booked
-- Uses pg_net to POST asynchronously (non-blocking)
-- ============================================================

CREATE OR REPLACE FUNCTION notify_query_booked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_url TEXT;
  service_key TEXT;
BEGIN
  -- Only fire when transitioning INTO 'booked' (not on re-saves)
  IF NEW.status = 'booked' AND (OLD.status IS DISTINCT FROM 'booked') THEN
    edge_url  := current_setting('app.supabase_url', true) || '/functions/v1/auto-generate-supplier-drafts';
    service_key := current_setting('app.service_role_key', true);

    PERFORM net.http_post(
      url     := edge_url,
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body    := jsonb_build_object(
        'query_id', NEW.id::text,
        'dmc_id',   NEW.dmc_id::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop before re-creating (idempotent)
DROP TRIGGER IF EXISTS on_query_booked ON whitelabel_queries;

CREATE TRIGGER on_query_booked
  AFTER UPDATE OF status ON whitelabel_queries
  FOR EACH ROW
  EXECUTE FUNCTION notify_query_booked();

COMMENT ON FUNCTION notify_query_booked() IS
  'Fires when a query status changes to booked. '
  'Calls the auto-generate-supplier-drafts Edge Function via pg_net (async, non-blocking). '
  'Requires app.supabase_url and app.service_role_key database settings.';

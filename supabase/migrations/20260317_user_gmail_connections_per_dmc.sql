-- Gmail connection per (user, DMC): one row per user per DMC
-- Replaces single connection per user so each DMC can have its own Gmail.

ALTER TABLE public.user_gmail_connections
  DROP CONSTRAINT IF EXISTS user_gmail_connections_user_id_key;

ALTER TABLE public.user_gmail_connections
  ADD CONSTRAINT user_gmail_connections_user_id_dmc_id_key UNIQUE (user_id, dmc_id);

COMMENT ON TABLE public.user_gmail_connections IS 'Stores Gmail OAuth tokens per user per DMC for CRM email integration.';

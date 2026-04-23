ALTER TABLE public.user_gmail_connections
  ADD COLUMN IF NOT EXISTS needs_reauth BOOLEAN NOT NULL DEFAULT false;

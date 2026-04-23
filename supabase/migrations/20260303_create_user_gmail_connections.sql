-- Gmail OAuth connection per user (one connection per user)
-- Used by CRM ops emails section to read/send Gmail via Gmail API

CREATE TABLE public.user_gmail_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dmc_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  gmail_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_gmail_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns_connection"
  ON public.user_gmail_connections
  FOR ALL
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_gmail_connections IS 'Stores Gmail OAuth tokens for CRM email integration; one row per user.';

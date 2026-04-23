-- email_metadata: associates Gmail messages with CRM queries
-- Body is NOT stored — fetch from Gmail API on demand (per SKILL.md spec)

CREATE TABLE public.email_metadata (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id TEXT        NOT NULL,
  gmail_thread_id  TEXT        NOT NULL,
  query_id         TEXT        NOT NULL,
  supplier_id      UUID,
  service_tags     TEXT[]      NOT NULL DEFAULT '{}',
  is_draft         BOOLEAN     NOT NULL DEFAULT false,
  dmc_id           UUID        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gmail_message_id, query_id)
);

ALTER TABLE public.email_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dmc_team_can_manage_email_metadata"
  ON public.email_metadata
  FOR ALL
  USING (
    dmc_id IN (
      SELECT dmc_id FROM dmc_team_members WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.email_metadata IS
  'Associates Gmail messages with CRM queries. Written on send or manual attach. Body not stored — fetch from Gmail API on demand.';

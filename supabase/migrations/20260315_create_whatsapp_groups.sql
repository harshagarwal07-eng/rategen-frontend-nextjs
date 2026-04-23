-- WhatsApp groups linked to CRM queries and DMCs
-- Stores group metadata from Periskope; messages fetched on demand (not stored)

CREATE TABLE public.whatsapp_groups (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  periskope_chat_id TEXT        NOT NULL UNIQUE,
  query_id          UUID        NOT NULL REFERENCES whitelabel_queries(id) ON DELETE CASCADE,
  dmc_id            UUID        NOT NULL REFERENCES dmcs(id) ON DELETE CASCADE,
  group_name        TEXT        NOT NULL,
  participant_phones TEXT[]     NOT NULL DEFAULT '{}',
  label_ids         TEXT[]      NOT NULL DEFAULT '{}',
  status            TEXT        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'completed', 'pending')),
  invite_link       TEXT,
  created_by        UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_groups_query  ON whatsapp_groups(query_id);
CREATE INDEX idx_wa_groups_dmc    ON whatsapp_groups(dmc_id);
CREATE INDEX idx_wa_groups_status ON whatsapp_groups(status);

ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dmc_team_wa_groups"
  ON public.whatsapp_groups
  FOR ALL
  USING (
    dmc_id IN (
      SELECT dmc_id FROM dmc_team_members WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.whatsapp_groups IS
  'Links Periskope WhatsApp groups to CRM queries and DMCs. Messages not stored — fetched from Periskope API on demand.';

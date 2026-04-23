-- Periskope connection per DMC (one Periskope org per DMC)

CREATE TABLE public.dmc_periskope_connections (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dmc_id       UUID        NOT NULL REFERENCES dmcs(id) ON DELETE CASCADE,
  api_key      TEXT        NOT NULL,
  phone_id     TEXT        NOT NULL,   -- connected phone: country_code+number e.g. "918527184400"
  org_id       TEXT,                   -- Periskope org_id (from response headers)
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dmc_id)
);

ALTER TABLE public.dmc_periskope_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dmc_team_periskope"
  ON public.dmc_periskope_connections
  FOR ALL
  USING (
    dmc_id IN (
      SELECT dmc_id FROM dmc_team_members WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.dmc_periskope_connections IS
  'Stores Periskope API credentials per DMC for WhatsApp integration. One row per DMC.';



-- RLS policy: Users can manage their own library items within their DMC
CREATE POLICY "Users can manage their own library items"
  ON itinerary_library
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Also allow DMC members to view items from their DMC
CREATE POLICY "DMC members can view library items"
  ON itinerary_library
  FOR SELECT
  USING (
    dmc_id IN (
      SELECT dmc_id FROM dmc_users WHERE user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_itinerary_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER itinerary_library_updated_at
  BEFORE UPDATE ON itinerary_library
  FOR EACH ROW
  EXECUTE FUNCTION update_itinerary_library_updated_at();

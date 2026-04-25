-- Convert fd_itinerary_days.meals_included from TEXT (JSON-encoded string) to native text[].
-- Existing rows are JSON arrays: [], ["Breakfast","Vegan Dinner"], etc. (verified pre-migration).
-- COALESCE guards against empty JSON arrays where array_agg over zero rows returns NULL.

ALTER TABLE fd_itinerary_days ADD COLUMN meals_included_new text[] NOT NULL DEFAULT '{}';

UPDATE fd_itinerary_days SET meals_included_new = (
  CASE
    WHEN meals_included IS NULL OR meals_included = '' THEN '{}'::text[]
    ELSE COALESCE(
      (SELECT array_agg(value::text) FROM jsonb_array_elements_text(meals_included::jsonb)),
      '{}'::text[]
    )
  END
);

ALTER TABLE fd_itinerary_days DROP COLUMN meals_included;
ALTER TABLE fd_itinerary_days RENAME COLUMN meals_included_new TO meals_included;

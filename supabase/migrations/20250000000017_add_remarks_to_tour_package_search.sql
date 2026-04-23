-- Add remarks field to tour package search (Stage 2)
-- This enables the package selector to see operational day info for SIC/Private decisions

-- Drop and recreate the function with remarks field
DROP FUNCTION IF EXISTS fetch_packages_for_tours(uuid[]);

CREATE OR REPLACE FUNCTION fetch_packages_for_tours(
  p_tour_ids uuid[]
)
RETURNS TABLE (
  package_id uuid,
  tour_id uuid,
  tour_name text,
  package_name text,
  description text,
  remarks text,  -- Added: AI remarks with operational day info (e.g., "SIC operates Tue & Fri only")
  includes_transfer boolean,
  preferred boolean,
  iscombo boolean,
  duration jsonb,
  categories jsonb,
  seasons jsonb[],
  age_policy jsonb,
  city text,
  country text,
  currency text
)
LANGUAGE sql STABLE
AS $$
  SELECT2
    tp.id as package_id,
    tp.tour_id,
    t.tour_name,
    tp.name as package_name,
    tp.description,
    tp.remarks,  -- Added: Package remarks containing operational day constraints
    tp.includes_transfer,
    tp.preferred,
    tp.iscombo,
    tp.duration,
    tp.categories,
    tp.seasons,
    tp.age_policy,
    c.city_name as city,
    co.country_name as country,
    t.currency
  FROM tour_packages tp
  JOIN tours t ON tp.tour_id = t.id
  LEFT JOIN cities c ON t.city = c.id
  LEFT JOIN countries co ON t.country = co.id
  WHERE tp.tour_id = ANY(p_tour_ids)
  ORDER BY t.preferred DESC, tp.preferred DESC, tp."order" ASC;
$$;

COMMENT ON FUNCTION fetch_packages_for_tours IS 'Stage 2: Get packages for selected tours. Now includes remarks for operational day validation.';

-- Create view for itinerary_library with resolved city and country names
-- The city and country columns store UUIDs, this view resolves them to names

CREATE OR REPLACE VIEW vw_itinerary_library AS
SELECT
  il.id,
  il.user_id,
  il.dmc_id,
  il.ta_id,
  il.is_public,
  il.service_type,
  il.name,
  -- Keep original UUID references
  il.city AS city_id,
  il.country AS country_id,
  -- Resolved names (with fallback to original value if not a valid UUID reference)
  COALESCE(c.city_name, il.city) AS city,
  COALESCE(co.country_name, il.country) AS country,
  il.address,
  il.phone,
  il.email,
  il.images,
  il.data,
  il.base_rate,
  il.currency,
  il.created_at,
  il.updated_at
FROM itinerary_library il
LEFT JOIN cities c ON il.city::uuid = c.id
LEFT JOIN countries co ON il.country::uuid = co.id;

-- Grant permissions (same as base table)
GRANT SELECT ON vw_itinerary_library TO authenticated;

COMMENT ON VIEW vw_itinerary_library IS 'View of itinerary_library with city and country names resolved from UUIDs';

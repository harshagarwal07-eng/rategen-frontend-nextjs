-- Update vw_tours_packages to include duration
DROP VIEW IF EXISTS public.vw_tours_packages;

CREATE VIEW public.vw_tours_packages AS
SELECT
  tp.id,
  tp.tour_id,
  tp.name AS package_name,
  tp.seasons,
  tp.description AS package_description,
  tp.remarks AS package_remarks,
  tp.child_policy AS package_child_policy,
  tp.preferred AS package_preferred,
  tp.iscombo,
  tp.duration,
  t.tour_name,
  t.description AS tour_description,
  t.remarks AS tour_remarks,
  t.cancellation_policy,
  t.child_policy AS tour_child_policy,
  t.preferred AS tour_preferred,
  t.markup,
  t.currency,
  co.country_name AS country,
  ci.city_name AS city,
  t.formatted_address,
  t.types,
  t.dmc_id,
  t.examples,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', tao.id,
        'name', tao.name,
        'ticket_only_rate_adult', tao.ticket_only_rate_adult,
        'ticket_only_rate_child', tao.ticket_only_rate_child
      )
    ) FILTER (WHERE tao.id IS NOT NULL),
    '[]'::jsonb
  ) AS add_ons
FROM
  tour_packages tp
  JOIN tours t ON tp.tour_id = t.id
  LEFT JOIN cities ci ON t.city = ci.id
  LEFT JOIN countries co ON t.country = co.id
  LEFT JOIN tour_package_add_ons tpao ON tp.id = tpao.package_id
  LEFT JOIN tour_add_ons tao ON tpao.add_on_id = tao.id
GROUP BY
  tp.id,
  tp.tour_id,
  tp.name,
  tp.seasons,
  tp.description,
  tp.remarks,
  tp.child_policy,
  tp.preferred,
  tp.iscombo,
  tp.duration,
  t.id,
  t.tour_name,
  t.description,
  t.remarks,
  t.cancellation_policy,
  t.child_policy,
  t.preferred,
  t.markup,
  t.currency,
  co.country_name,
  ci.city_name,
  t.formatted_address,
  t.types,
  t.dmc_id,
  t.examples;


-- Update vw_transfers_packages to include duration
DROP VIEW IF EXISTS public.vw_transfers_packages;

CREATE VIEW public.vw_transfers_packages AS
SELECT
  tp.id,
  tp.transfer_id,
  tp.name AS package_name,
  tp.seasons,
  tp.description AS package_description,
  tp.remarks AS package_remarks,
  tp.child_policy AS package_child_policy,
  tp.preferred AS package_preferred,
  tp.iscombo,
  tp.duration,
  t.transfer_name,
  t.description AS transfer_description,
  t.mode,
  t.preferred AS transfer_preferred,
  t.markup,
  t.rule,
  t.raw_rates,
  t.child_policy AS transfer_child_policy,
  t.cancellation_policy,
  t.remarks AS transfer_remarks,
  t.currency,
  co.country_name AS country,
  ci.city_name AS city,
  t.examples,
  t.route,
  t.dmc_id
FROM
  transfer_packages tp
  JOIN transfers t ON tp.transfer_id = t.id
  LEFT JOIN cities ci ON t.city = ci.id
  LEFT JOIN countries co ON t.country = co.id
GROUP BY
  tp.id,
  tp.transfer_id,
  tp.name,
  tp.seasons,
  tp.description,
  tp.remarks,
  tp.child_policy,
  tp.preferred,
  tp.iscombo,
  tp.duration,
  t.id,
  t.transfer_name,
  t.description,
  t.mode,
  t.preferred,
  t.markup,
  t.rule,
  t.raw_rates,
  t.child_policy,
  t.cancellation_policy,
  t.remarks,
  t.currency,
  co.country_name,
  ci.city_name,
  t.examples,
  t.route,
  t.dmc_id;

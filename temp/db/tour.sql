 create table public.tours (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  tour_name text not null,
  description text null,
  remarks text null,
  cancellation_policy text null,
  child_policy text null,
  preferred boolean not null default false,
  markup text null,
  currency text null,
  country uuid null,
  city uuid null,
  formatted_address text null,
  website text null,
  latitude double precision null,
  longitude double precision null,
  rating real null,
  user_ratings_total integer null,
  photos jsonb null,
  types text[] null,
  review_summary text null,
  maps_url text null,
  place_id text null,
  images text[] null,
  timings text[] not null default '{}'::text[],
  created_by uuid not null,
  dmc_id uuid not null,
  updated_at timestamp with time zone null,
  examples text null,
  notes text null,
  constraint tours_pkey primary key (id),
  constraint tours_city_fkey foreign KEY (city) references cities (id) on delete set null,
  constraint tours_country_fkey foreign KEY (country) references countries (id) on delete set null,
  constraint tours_created_by_fkey foreign KEY (created_by) references profile (user_id) on delete CASCADE,
  constraint tours_dmc_id_fkey foreign KEY (dmc_id) references dmcs (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists tours_dmc_id_idx on public.tours using btree (dmc_id) TABLESPACE pg_default;

create trigger tours_vs_delete_trigger BEFORE DELETE on tours for EACH row
execute FUNCTION handle_tours_delete ();

create trigger tours_vs_insert_trigger
after INSERT on tours for EACH row
execute FUNCTION handle_tours_upsert ();

create trigger tours_vs_update_trigger
after
update on tours for EACH row when (
  old.tour_name is distinct from new.tour_name
  or old.description is distinct from new.description
  or old.remarks is distinct from new.remarks
  or old.cancellation_policy is distinct from new.cancellation_policy
  or old.child_policy is distinct from new.child_policy
  or old.formatted_address is distinct from new.formatted_address
  or old.review_summary is distinct from new.review_summary
  or old.currency is distinct from new.currency
  or old.markup is distinct from new.markup
  or old.timings is distinct from new.timings
  or old.types is distinct from new.types
)
execute FUNCTION handle_tours_upsert ();

create table public.tour_packages (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  tour_id uuid not null,
  name text not null,
  seasons jsonb[] null default '{}'::jsonb[],
  description text null,
  remarks text null,
  child_policy text null,
  preferred boolean null default false,
  iscombo boolean null default false,
  "order" smallint not null default '0'::smallint,
  embedding extensions.vector null,
  includes_transfer boolean not null default false,
  notes text null,
  inclusions text null,
  exclusions text null,
  age_policy jsonb null default '{}'::jsonb,
  max_participants integer null,
  images text[] null default '{}'::text[],
  meeting_point text null,
  pickup_point text null,
  dropoff_point text null,
  operational_hours jsonb null default '[]'::jsonb,
  duration jsonb null default '{}'::jsonb,
  categories jsonb null default '[]'::jsonb,
  constraint packages_pkey primary key (id),
  constraint packages_tour_id_fkey foreign KEY (tour_id) references tours (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_packages_tour_id on public.tour_packages using btree (tour_id) TABLESPACE pg_default;

create index IF not exists tour_packages_embedding_idx on public.tour_packages using hnsw (embedding extensions.vector_cosine_ops) TABLESPACE pg_default;

create index IF not exists idx_tour_packages_tour_id on public.tour_packages using btree (tour_id) TABLESPACE pg_default;

create index IF not exists idx_tour_packages_duration on public.tour_packages using gin (duration) TABLESPACE pg_default;

create trigger update_packages_updated_at BEFORE
update on tour_packages for EACH row
execute FUNCTION update_updated_at_column ();

create table public.tour_add_ons (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  tour_id uuid not null,
  name text not null,
  ticket_only_rate_adult numeric(10, 2) null,
  ticket_only_rate_child numeric(10, 2) null,
  description text null,
  notes text null,
  age_policy jsonb null default '{}'::jsonb,
  ticket_only_rate_infant numeric(10, 2) null,
  ticket_only_rate_teenager numeric(10, 2) null,
  total_rate numeric(10, 2) null,
  max_participants integer null,
  images text[] null default '{}'::text[],
  remarks text null,
  constraint tour_add_ons_pkey primary key (id),
  constraint tour_add_ons_tour_id_fkey foreign KEY (tour_id) references tours (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_tour_add_ons_tour_id on public.tour_add_ons using btree (tour_id) TABLESPACE pg_default;

create trigger update_tour_add_ons_timestamp BEFORE
update on tour_add_ons for EACH row
execute FUNCTION update_tour_add_ons_updated_at ();

create table public.tour_package_add_ons (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default now(),
  package_id uuid not null,
  add_on_id uuid not null,
  is_mandatory boolean null default false,
  constraint tour_package_add_ons_pkey primary key (id),
  constraint tour_package_add_ons_package_id_add_on_id_key unique (package_id, add_on_id),
  constraint tour_package_add_ons_add_on_id_fkey foreign KEY (add_on_id) references tour_add_ons (id) on delete CASCADE,
  constraint tour_package_add_ons_package_id_fkey foreign KEY (package_id) references tour_packages (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_tour_package_add_ons_package_id on public.tour_package_add_ons using btree (package_id) TABLESPACE pg_default;

create index IF not exists idx_tour_package_add_ons_add_on_id on public.tour_package_add_ons using btree (add_on_id) TABLESPACE pg_default;

create view public.vw_tours_packages as
select
  tp.id,
  tp.tour_id,
  tp.name as package_name,
  tp.seasons,
  tp.description as package_description,
  tp.remarks as package_remarks,
  tp.child_policy as package_child_policy,
  tp.preferred as package_preferred,
  tp.iscombo,
  t.tour_name,
  t.description as tour_description,
  t.remarks as tour_remarks,
  t.cancellation_policy,
  t.child_policy as tour_child_policy,
  t.preferred as tour_preferred,
  t.markup,
  t.currency,
  co.country_name as country,
  ci.city_name as city,
  t.formatted_address,
  t.types,
  t.dmc_id,
  t.examples,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',
        tao.id,
        'name',
        tao.name,
        'ticket_only_rate_adult',
        tao.ticket_only_rate_adult,
        'ticket_only_rate_child',
        tao.ticket_only_rate_child
      )
    ) filter (
      where
        tao.id is not null
    ),
    '[]'::jsonb
  ) as add_ons
from
  tour_packages tp
  join tours t on tp.tour_id = t.id
  left join cities ci on t.city = ci.id
  left join countries co on t.country = co.id
  left join tour_package_add_ons tpao on tp.id = tpao.package_id
  left join tour_add_ons tao on tpao.add_on_id = tao.id
group by
  tp.id,
  tp.tour_id,
  tp.name,
  tp.seasons,
  tp.description,
  tp.remarks,
  tp.child_policy,
  tp.preferred,
  tp.iscombo,
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

  create view public.vw_tours_packages_list as
select
  t.id,
  t.dmc_id,
  t.tour_name,
  co.country_name as country,
  tp.name as package_name,
  tp.preferred
from
  tour_packages tp
  join tours t on tp.tour_id = t.id
  left join countries co on t.country = co.id;
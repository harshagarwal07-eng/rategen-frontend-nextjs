create table public.transfers (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  transfer_name text null,
  description text null,
  mode text null,
  preferred boolean not null default false,
  markup smallint null,
  rule text null,
  raw_rates text null,
  child_policy text null,
  cancellation_policy text null,
  remarks text null,
  currency text null,
  created_by uuid not null,
  dmc_id uuid not null,
  country uuid null,
  city uuid null,
  images text[] not null default '{}'::text[],
  updated_at timestamp with time zone null default now(),
  examples text null,
  route text null,
  constraint transfers_pkey primary key (id),
  constraint transfers_city_fkey foreign KEY (city) references cities (id) on delete set null,
  constraint transfers_country_fkey foreign KEY (country) references countries (id) on delete set null,
  constraint transfers_created_by_fkey foreign KEY (created_by) references profile (user_id) on delete CASCADE,
  constraint transfers_dmc_id_fkey foreign KEY (dmc_id) references dmcs (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists transfers_dmc_id_idx on public.transfers using btree (dmc_id) TABLESPACE pg_default;

create trigger transfers_vs_delete_trigger BEFORE DELETE on transfers for EACH row
execute FUNCTION handle_transfers_delete ();

create trigger transfers_vs_insert_trigger
after INSERT on transfers for EACH row
execute FUNCTION handle_transfers_upsert ();

create trigger transfers_vs_update_trigger
after
update on transfers for EACH row when (
  old.transfer_name is distinct from new.transfer_name
  or old.description is distinct from new.description
  or old.mode is distinct from new.mode
  or old.rule is distinct from new.rule
  or old.child_policy is distinct from new.child_policy
  or old.cancellation_policy is distinct from new.cancellation_policy
  or old.remarks is distinct from new.remarks
  or old.currency is distinct from new.currency
)
execute FUNCTION handle_transfers_upsert ();

create table public.transfer_add_ons (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  transfer_id uuid not null,
  name text not null,
  description text null,
  is_mandatory boolean null default false,
  remarks text null,
  notes text null,
  rate_adult numeric null,
  rate_child numeric null,
  max_participants smallint null,
  images text[] null default '{}'::text[],
  age_policy jsonb null,
  rate_teenager numeric null,
  rate_infant numeric null,
  total_rate numeric null,
  constraint transfer_add_ons_pkey primary key (id),
  constraint transfer_add_ons_transfer_id_fkey foreign KEY (transfer_id) references transfers (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.transfer_package_add_ons (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  transfer_package_id uuid not null,
  transfer_add_on_id uuid not null,
  is_mandatory boolean null default false,
  constraint transfer_package_add_ons_pkey primary key (id),
  constraint transfer_package_add_ons_transfer_package_id_transfer_add_o_key unique (transfer_package_id, transfer_add_on_id),
  constraint transfer_package_add_ons_transfer_add_on_id_fkey foreign KEY (transfer_add_on_id) references transfer_add_ons (id) on delete CASCADE,
  constraint transfer_package_add_ons_transfer_package_id_fkey foreign KEY (transfer_package_id) references transfer_packages (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_transfer_package_add_ons_package_id on public.transfer_package_add_ons using btree (transfer_package_id) TABLESPACE pg_default;

create index IF not exists idx_transfer_package_add_ons_add_on_id on public.transfer_package_add_ons using btree (transfer_add_on_id) TABLESPACE pg_default;

create trigger update_transfer_package_add_ons_updated_at BEFORE
update on transfer_package_add_ons for EACH row
execute FUNCTION update_updated_at_column ();

create table public.transfer_packages (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  transfer_id uuid not null,
  name text not null,
  seasons jsonb[] null default '{}'::jsonb[],
  description text null,
  remarks text null,
  child_policy text null,
  preferred boolean null default false,
  iscombo boolean null default false,
  "order" smallint not null default '0'::smallint,
  embedding extensions.vector null,
  notes text null,
  inclusions text null,
  exclusions text null,
  origin text null,
  destination text null,
  num_stops smallint null,
  via text null,
  duration jsonb null,
  meeting_point text null,
  pickup_point text null,
  dropoff_point text null,
  images text[] null default '{}'::text[],
  operational_hours jsonb null default '[]'::jsonb,
  selected_add_ons jsonb null default '[]'::jsonb,
  transfer_type text[] null default '{}'::text[],
  constraint transfer_packages_pkey primary key (id),
  constraint transfer_packages_transfer_id_fkey foreign KEY (transfer_id) references transfers (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists transfer_packages_embedding_idx on public.transfer_packages using hnsw (embedding extensions.vector_cosine_ops) TABLESPACE pg_default;

create index IF not exists idx_transfer_packages_transfer_id on public.transfer_packages using btree (transfer_id) TABLESPACE pg_default;

create view public.vw_transfer_list as
select
  c.city_name as city,
  co.country_name as country,
  t.transfer_name,
  t.preferred,
  t.route,
  t.dmc_id
from
  transfers t
  left join cities c on t.city = c.id
  left join countries co on t.country = co.id;

  create view public.vw_transfers_packages as
select
  tp.id,
  tp.transfer_id,
  tp.name as package_name,
  tp.seasons,
  tp.description as package_description,
  tp.remarks as package_remarks,
  tp.child_policy as package_child_policy,
  tp.preferred as package_preferred,
  tp.iscombo,
  t.transfer_name,
  t.description as transfer_description,
  t.mode,
  t.preferred as transfer_preferred,
  t.markup,
  t.rule,
  t.raw_rates,
  t.child_policy as transfer_child_policy,
  t.cancellation_policy,
  t.remarks as transfer_remarks,
  t.currency,
  co.country_name as country,
  ci.city_name as city,
  t.examples,
  t.route,
  t.dmc_id
from
  transfer_packages tp
  join transfers t on tp.transfer_id = t.id
  left join cities ci on t.city = ci.id
  left join countries co on t.country = co.id
group by
  tp.id,
  tp.transfer_id,
  tp.name,
  tp.seasons,
  tp.description,
  tp.remarks,
  tp.child_policy,
  tp.preferred,
  tp.iscombo,
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

  create view public.vw_transfers_packages_list as
select
  t.id,
  t.dmc_id,
  t.transfer_name,
  co.country_name as country,
  tp.name as package_name,
  tp.preferred
from
  transfer_packages tp
  join transfers t on tp.transfer_id = t.id
  left join countries co on t.country = co.id;
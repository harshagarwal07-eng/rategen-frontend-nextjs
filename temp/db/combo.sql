create table public.combos (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  remarks text null,
  age_policy jsonb null default '{}'::jsonb,
  currency text null default 'USD'::text,
  created_by uuid null,
  dmc_id uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  country uuid null,
  city uuid null,
  constraint combos_pkey primary key (id),
  constraint combos_city_fkey foreign KEY (city) references cities (id),
  constraint combos_country_fkey foreign KEY (country) references countries (id),
  constraint combos_created_by_fkey foreign KEY (created_by) references auth.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_combos_dmc_id on public.combos using btree (dmc_id) TABLESPACE pg_default;

create index IF not exists idx_combos_created_by on public.combos using btree (created_by) TABLESPACE pg_default;

create index IF not exists idx_combos_country on public.combos using btree (country) TABLESPACE pg_default;

create index IF not exists idx_combos_city on public.combos using btree (city) TABLESPACE pg_default;

create table public.combo_seasons (
  id uuid not null default gen_random_uuid (),
  combo_id uuid not null,
  dates text null,
  blackout_dates text null,
  exception_rules text null,
  "order" integer not null default 0,
  ticket_only_rate_adult numeric(10, 2) null,
  ticket_only_rate_child numeric(10, 2) null,
  ticket_only_rate_teenager numeric(10, 2) null,
  ticket_only_rate_infant numeric(10, 2) null,
  sic_rate_adult numeric(10, 2) null,
  sic_rate_child numeric(10, 2) null,
  sic_rate_teenager numeric(10, 2) null,
  sic_rate_infant numeric(10, 2) null,
  pvt_rate jsonb null default '{}'::jsonb,
  per_vehicle_rate jsonb null default '[]'::jsonb,
  total_rate numeric(10, 2) null,
  created_at timestamp with time zone null default now(),
  constraint combo_seasons_pkey primary key (id),
  constraint combo_seasons_combo_id_fkey foreign KEY (combo_id) references combos (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_combo_seasons_combo_id on public.combo_seasons using btree (combo_id) TABLESPACE pg_default;

create table public.combo_items (
  id uuid not null default gen_random_uuid (),
  combo_id uuid not null,
  item_type text not null,
  tour_id uuid null,
  transfer_id uuid null,
  tour_package_id uuid null,
  transfer_package_id uuid null,
  package_name text null,
  "order" integer not null default 0,
  created_at timestamp with time zone null default now(),
  constraint combo_items_pkey primary key (id),
  constraint combo_items_tour_id_fkey foreign KEY (tour_id) references tours (id) on delete set null,
  constraint combo_items_transfer_package_id_fkey foreign KEY (transfer_package_id) references transfer_packages (id) on delete set null,
  constraint combo_items_combo_id_fkey foreign KEY (combo_id) references combos (id) on delete CASCADE,
  constraint combo_items_tour_package_id_fkey foreign KEY (tour_package_id) references tour_packages (id) on delete set null,
  constraint combo_items_transfer_id_fkey foreign KEY (transfer_id) references transfers (id) on delete set null,
  constraint combo_items_item_type_check check (
    (
      item_type = any (array['tour'::text, 'transfer'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_combo_items_combo_id on public.combo_items using btree (combo_id) TABLESPACE pg_default;

create index IF not exists idx_combo_items_tour_package_id on public.combo_items using btree (tour_package_id) TABLESPACE pg_default;

create index IF not exists idx_combo_items_transfer_package_id on public.combo_items using btree (transfer_package_id) TABLESPACE pg_default;

create trigger cleanup_combo_items_after_update
after
update on combo_items for EACH STATEMENT
execute FUNCTION cleanup_orphaned_combo_items ();
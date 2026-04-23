create table public.hotels (
  created_at timestamp with time zone not null default now(),
  hotel_name text not null,
  hotel_code text null,
  hotel_address text null,
  hotel_city uuid not null,
  hotel_country uuid not null,
  hotel_phone text null,
  hotel_email text null,
  hotel_description text null,
  hotel_currency text null,
  created_by uuid not null,
  dmc_id uuid not null,
  id uuid not null default gen_random_uuid (),
  examples text null,
  remarks text null,
  cancellation_policy text null,
  payment_policy text null,
  property_type text null,
  star_rating text null,
  preferred boolean not null default false,
  markup smallint null,
  updated_at timestamp with time zone null default now(),
  offers text null,
  age_policy jsonb null,
  meal_plan_rates jsonb null,
  group_policy text null,
  constraint hotels_pkey primary key (id),
  constraint hotel_created_by_fkey foreign KEY (created_by) references profile (user_id) on delete CASCADE,
  constraint hotels_dmc_id_fkey foreign KEY (dmc_id) references dmcs (id) on delete CASCADE,
  constraint hotels_hotel_city_fkey foreign KEY (hotel_city) references cities (id) on delete set null,
  constraint hotels_hotel_country_fkey foreign KEY (hotel_country) references countries (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists hotels_dmc_id_idx on public.hotels using btree (dmc_id) TABLESPACE pg_default;

create index IF not exists idx_hotels_examples on public.hotels using gin (to_tsvector('english'::regconfig, examples)) TABLESPACE pg_default;

create trigger hotels_vs_delete_trigger BEFORE DELETE on hotels for EACH row
execute FUNCTION handle_hotels_delete ();

create trigger hotels_vs_insert_trigger
after INSERT on hotels for EACH row
execute FUNCTION handle_hotels_upsert ();

create trigger hotels_vs_update_trigger
after
update on hotels for EACH row when (
  old.hotel_name is distinct from new.hotel_name
  or old.hotel_description is distinct from new.hotel_description
  or old.hotel_address is distinct from new.hotel_address
  or old.hotel_city is distinct from new.hotel_city
  or old.hotel_country is distinct from new.hotel_country
  or old.hotel_currency is distinct from new.hotel_currency
)
execute FUNCTION handle_hotels_upsert ();

create table public.hotel_rooms (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  hotel_id uuid not null,
  room_category text not null,
  meal_plan text null,
  max_occupancy text null,
  other_details text null,
  seasons jsonb null default '[]'::jsonb,
  embedding extensions.vector null,
  extra_bed_policy text null,
  sort_order integer null default 0,
  stop_sale text null,
  constraint hotel_rooms_pkey primary key (id),
  constraint hotel_rooms_hotel_id_fkey foreign KEY (hotel_id) references hotels (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists hotel_rooms_embedding_idx on public.hotel_rooms using hnsw (embedding extensions.vector_cosine_ops) TABLESPACE pg_default;

create index IF not exists idx_hotel_rooms_seasons on public.hotel_rooms using gin (seasons) TABLESPACE pg_default;

create index IF not exists idx_hotel_rooms_hotel_id on public.hotel_rooms using btree (hotel_id) TABLESPACE pg_default;

create trigger trigger_auto_generate_hotel_room_embedding_insert
after INSERT on hotel_rooms for EACH row
execute FUNCTION auto_generate_hotel_room_embedding ();

create trigger trigger_auto_generate_hotel_room_embedding_update
after
update OF hotel_id,
room_category,
meal_plan,
max_occupancy,
other_details on hotel_rooms for EACH row when (
  old.hotel_id is distinct from new.hotel_id
  or old.room_category is distinct from new.room_category
  or old.meal_plan is distinct from new.meal_plan
  or old.max_occupancy is distinct from new.max_occupancy
  or old.other_details is distinct from new.other_details
  or old.extra_bed_policy is distinct from new.extra_bed_policy
)
execute FUNCTION auto_generate_hotel_room_embedding ();

create view public.vw_hotel_rooms as
select
  hr.id,
  hr.hotel_id,
  hr.room_category,
  hr.meal_plan,
  hr.max_occupancy,
  hr.other_details,
  hr.seasons,
  hr.extra_bed_policy,
  h.hotel_name,
  h.hotel_code,
  h.hotel_address,
  co.country_name as hotel_country,
  ci.city_name as hotel_city,
  h.hotel_phone,
  h.hotel_email,
  h.hotel_description,
  h.hotel_currency,
  h.examples,
  h.remarks,
  h.cancellation_policy,
  h.payment_policy,
  h.property_type,
  h.star_rating,
  h.preferred,
  h.markup,
  h.offers,
  h.dmc_id,
  h.age_policy,
  h.meal_plan_rates
from
  hotel_rooms hr
  join hotels h on hr.hotel_id = h.id
  left join cities ci on h.hotel_city = ci.id
  left join countries co on h.hotel_country = co.id;

create view public.vw_hotels_rooms_list as
select
  h.dmc_id,
  h.hotel_name,
  ci.city_name as hotel_city,
  co.country_name as hotel_country,
  h.preferred,
  h.star_rating,
  h.hotel_address,
  jsonb_agg(
    jsonb_build_object(
      'room_category',
      hr.room_category,
      'max_occupancy',
      hr.max_occupancy
    )
  ) as rooms
from
  hotels h
  left join hotel_rooms hr on h.id = hr.hotel_id
  left join cities ci on h.hotel_city = ci.id
  left join countries co on h.hotel_country = co.id
group by
  h.id,
  h.hotel_name,
  ci.city_name,
  co.country_name,
  h.preferred,
  h.star_rating,
  h.hotel_address;
-- states table with country_code fkey
create table public.states (
  id uuid not null default gen_random_uuid (),
  state_code char(2) ,
  state_name varchar(100) not null,
  country_code char(2) not null,
  constraint states_pkey primary key (id),
  constraint states_code_country_code_uk unique (state_code, country_code),
  constraint states_country_code_fkey
    foreign key (country_code)
    references countries (country_code)
);

alter table public.states enable row level security;

create policy "Policy with security definer functions"
on "public"."states"
as permissive
for all
to public
using (true);

-- updating cities to have state fkey
alter table public.cities
add column state_code varchar(2) default null;

alter table public.cities
add constraint cities_state_code_country_code_fkey
foreign key (state_code, country_code)
references public.states (state_code, country_code) on delete set null;

-- seeding indian states data in states table
INSERT INTO public.states (state_name, state_code, country_code) VALUES
('Andhra Pradesh', 'AP', 'IN'),
('Arunachal Pradesh', 'AR', 'IN'),
('Assam', 'AS', 'IN'),
('Bihar', 'BR', 'IN'),
('Chhattisgarh', 'CG', 'IN'),
('Goa', 'GA', 'IN'),
('Gujarat', 'GJ', 'IN'),
('Haryana', 'HR', 'IN'),
('Himachal Pradesh', 'HP', 'IN'),
('Jharkhand', 'JH', 'IN'),
('Karnataka', 'KA', 'IN'),
('Kerala', 'KL', 'IN'),
('Madhya Pradesh', 'MP', 'IN'),
('Maharashtra', 'MH', 'IN'),
('Manipur', 'MN', 'IN'),
('Meghalaya', 'ML', 'IN'),
('Mizoram', 'MZ', 'IN'),
('Nagaland', 'NL', 'IN'),
('Odisha', 'OD', 'IN'),
('Punjab', 'PB', 'IN'),
('Rajasthan', 'RJ', 'IN'),
('Sikkim', 'SK', 'IN'),
('Tamil Nadu', 'TN', 'IN'),
('Telangana', 'TG', 'IN'),
('Tripura', 'TR', 'IN'),
('Uttar Pradesh', 'UP', 'IN'),
('Uttarakhand', 'UK', 'IN'),
('West Bengal', 'WB', 'IN'),
('Andaman & Nicobar Islands', 'AN', 'IN'),
('Chandigarh', 'CH', 'IN'),
('Dadra & Nagar Haveli and Daman & Diu', 'DD', 'IN'),
('Delhi (NCT)', 'DL', 'IN'),
('Jammu & Kashmir', 'JK', 'IN'),
('Ladakh', 'LA', 'IN'),
('Lakshadweep', 'LD', 'IN'),
('Puducherry', 'PY', 'IN');

-- update docs to have states fkey
alter table public.docs
add column state uuid default null;

alter table public.docs
add constraint docs_state_fkey
foreign key (state)
references states (id) on delete set null;

-- update hotels to have states fkey
alter table public.hotels
add column hotel_state uuid default null;

alter table public.hotels
add constraint hotels_hotel_state_fkey
foreign key (hotel_state)
references states (id) on delete set null;

-- update hotels_datastore to have states fkey
alter table public.hotels_datastore
add column hotel_state uuid default null;

alter table public.hotels_datastore
add constraint hotels_datastore_hotel_state_fkey
foreign key (hotel_state)
references states (id) on delete set null;

-- update tours to have states fkey
alter table public.tours
add column state uuid default null;

alter table public.tours
add constraint tours_state_fkey
foreign key (state)
references states (id) on delete set null;

-- update tours_datastore to have states fkey
alter table public.tours_datastore
add column state uuid default null;

alter table public.tours_datastore
add constraint tours_datastore_state_fkey
foreign key (state)
references states (id) on delete set null;

-- updating transfers to have states fkey
alter table public.transfers
add column state uuid default null;

alter table public.transfers
add constraint transfers_state_fkey
foreign key (state)
references states (id) on delete set null;

-- updating transfers_datastore to have states fkey
alter table public.transfers_datastore
add column state uuid default null;

alter table public.transfers_datastore
add constraint transfers_datastore_state_fkey
foreign key (state)
references states (id) on delete set null;


-- updating combos to have states fkey
alter table public.combos
add column state uuid default null;

alter table public.combos
add constraint combos_state_fkey
foreign key (state)
references states (id) on delete set null;

-- updating combos_datastore to have states fkey
alter table public.combos_datastore
add column state uuid default null;

alter table public.combos_datastore
add constraint combos_datastore_state_fkey
foreign key (state)
references states (id) on delete set null;


-- updating meals to have states fkey
alter table public.meals
add column state uuid default null;

alter table public.meals
add constraint meals_state_fkey
foreign key (state)
references states (id) on delete set null;

-- updating meals_datastore to have states fkey
alter table public.meals_datastore
add column state uuid default null;

alter table public.meals_datastore
add constraint meals_datastore_state_fkey
foreign key (state)
references states (id) on delete set null;


-- updating guides to have states fkey
alter table public.guides
add column state uuid default null;

alter table public.guides
add constraint guides_state_fkey
foreign key (state)
references states (id) on delete set null;

-- updating guides_datastore to have states fkey
alter table public.guides_datastore
add column state uuid default null;

alter table public.guides_datastore
add constraint guides_datastore_state_fkey
foreign key (state)
references states (id) on delete set null;

-- update docs view to accommodate states
DROP VIEW IF EXISTS public.vw_docs;
CREATE VIEW public.vw_docs AS
SELECT
  d.id,
  d.created_at,
  d.created_by,
  d.dmc_id,
  d.is_active,
  d.content,
  d.type,
  d.service_type,

  d.country,
  c.country_name,
  c.country_code,

  d.state,
  s.state_name,
  s.state_code,

  d.nights
FROM docs d
LEFT JOIN countries c ON d.country = c.id
LEFT JOIN states s ON d.state = s.id;

-- adding view to get country_id in states as well
create or replace view public.vw_states_with_country with (security_invoker = on) as
select
  s.id,
  s.state_name,
  s.state_code,
  s.country_code,
  c.id as country_id,
  c.country_name
from states s
join countries c
  on c.country_code = s.country_code;

-- adding view to get country and state in cities as well
drop view if exists public.cities_with_country;
create or replace view public.vw_cities_with_state_and_country with (security_invoker = on) as
select
  ci.id,
  ci.city_name,
  ci.city_code,

  ci.country_code,
  c.id as country_id,
  c.country_name,

  ci.state_code,
  s.id as state_id,
  s.state_name
from cities ci
join countries c
  on c.country_code = ci.country_code
left join states s
  on s.state_code = ci.state_code
 and s.country_code = ci.country_code;

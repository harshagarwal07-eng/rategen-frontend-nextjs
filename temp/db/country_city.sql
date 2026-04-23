create table public.countries (
  id uuid not null default gen_random_uuid (),
  country_code character varying(2) not null,
  country_name character varying(100) not null,
  constraint pk_b2d7006793e8697ab3ae2deff18 primary key (id),
  constraint countries_country_code_key unique (country_code)
) TABLESPACE pg_default;

create table public.cities (
  id uuid not null default extensions.uuid_generate_v4 (),
  city_code character varying(50) not null,
  city_name character varying(100) not null,
  country_code character varying(2) not null,
  constraint pk_4762ffb6e5d198cfec5606bc11e primary key (id),
  constraint cities_country_code_fkey foreign KEY (country_code) references countries (country_code)
) TABLESPACE pg_default;
-- Create table for storing formatted message content (WhatsApp, Email, PDF)
create table public.travel_agent_message_formats (
  id uuid not null default gen_random_uuid (),
  message_id uuid not null,
  whatsapp text not null,
  email text not null,
  pdf text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint travel_agent_message_formats_pkey primary key (id),
  constraint travel_agent_message_formats_message_id_key unique (message_id),
  constraint travel_agent_message_formats_message_id_fkey foreign KEY (message_id) references travel_agent_messages (id) on delete CASCADE
) TABLESPACE pg_default;

-- Create index for faster lookups by message_id
create index if not exists idx_message_formats_message_id on public.travel_agent_message_formats using btree (message_id) TABLESPACE pg_default;

-- Create function to update updated_at timestamp
create or replace function update_travel_agent_message_formats_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to auto-update updated_at
create trigger travel_agent_message_formats_updated_at
  before update on travel_agent_message_formats
  for each row
  execute function update_travel_agent_message_formats_updated_at();

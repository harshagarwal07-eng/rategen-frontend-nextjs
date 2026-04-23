-- Make query_id nullable so groups can exist without being linked to a specific query
-- (supports standalone group creation from /crm/whatsapp)
ALTER TABLE public.whatsapp_groups
  ALTER COLUMN query_id DROP NOT NULL;

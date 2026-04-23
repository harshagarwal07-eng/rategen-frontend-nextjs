-- Migration: Fix service_breakups foreign key references
-- Description: Update foreign keys to reference travel_agent_chats and travel_agent_messages
-- Run this if you already have the service_breakups table with wrong references

-- Drop the old foreign key constraints
ALTER TABLE public.service_breakups
DROP CONSTRAINT IF EXISTS service_breakups_chat_id_fkey;

ALTER TABLE public.service_breakups
DROP CONSTRAINT IF EXISTS service_breakups_message_id_fkey;

-- Add new foreign key constraints pointing to travel_agent tables
ALTER TABLE public.service_breakups
ADD CONSTRAINT service_breakups_chat_id_fkey
FOREIGN KEY (chat_id) REFERENCES travel_agent_chats(id) ON DELETE CASCADE;

ALTER TABLE public.service_breakups
ADD CONSTRAINT service_breakups_message_id_fkey
FOREIGN KEY (message_id) REFERENCES travel_agent_messages(id) ON DELETE CASCADE;

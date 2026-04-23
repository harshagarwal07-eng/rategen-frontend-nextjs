-- Migration: Add query_id to travel_agent_chats
-- Links AI chat sessions to CRM queries (1:1 relationship)

-- Add query_id column (nullable, references whitelabel_queries)
ALTER TABLE travel_agent_chats
ADD COLUMN query_id UUID REFERENCES whitelabel_queries(id) ON DELETE SET NULL;

-- Unique index to enforce 1:1 relationship (only one AI chat per query)
CREATE UNIQUE INDEX idx_travel_agent_chats_query_id
ON travel_agent_chats(query_id)
WHERE query_id IS NOT NULL;

-- Index for fast lookups by query_id
CREATE INDEX idx_travel_agent_chats_query_id_lookup
ON travel_agent_chats(query_id)
WHERE query_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN travel_agent_chats.query_id IS 'Links AI chat to a CRM query (whitelabel_queries). One-to-one relationship.';

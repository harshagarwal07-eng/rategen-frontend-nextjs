-- Add message versioning support
-- This allows for regenerate branching where each assistant message can have multiple versions

-- ===== Update travel_agent_messages table =====

-- Add version column (default to 1 for existing messages)
ALTER TABLE travel_agent_messages
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add parent_message_id column (references the user message this assistant message responds to)
ALTER TABLE travel_agent_messages
ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES travel_agent_messages(id) ON DELETE CASCADE;

-- Create index for querying versions by parent message
CREATE INDEX IF NOT EXISTS idx_travel_agent_messages_parent_message_id
ON travel_agent_messages(parent_message_id);

-- Create composite index for efficient version queries
CREATE INDEX IF NOT EXISTS idx_travel_agent_messages_parent_version
ON travel_agent_messages(parent_message_id, version);

-- Add comment explaining the versioning system
COMMENT ON COLUMN travel_agent_messages.version IS 'Version number for assistant messages (1, 2, 3...). Used for regenerate branching.';
COMMENT ON COLUMN travel_agent_messages.parent_message_id IS 'For assistant messages: references the user message this is responding to. NULL for user/system messages.';

-- ===== Update travel_agent_chats table =====

-- Add pinned column for pinning chats to top of sidebar
ALTER TABLE travel_agent_chats
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;

-- Add deleted_at column for soft deletes
ALTER TABLE travel_agent_chats
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for querying non-deleted chats
CREATE INDEX IF NOT EXISTS idx_travel_agent_chats_deleted_at
ON travel_agent_chats(deleted_at) WHERE deleted_at IS NULL;

-- Create index for querying pinned chats
CREATE INDEX IF NOT EXISTS idx_travel_agent_chats_pinned
ON travel_agent_chats(pinned) WHERE pinned = TRUE;

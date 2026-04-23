-- Token Usage History Table
-- Tracks all token usage even when messages are deleted
-- This ensures total token count never decreases

CREATE TABLE IF NOT EXISTS token_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES travel_agent_chats(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_message_text TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  model_used TEXT
);

-- Index for efficient querying by chat
CREATE INDEX IF NOT EXISTS idx_token_usage_history_chat_id
ON token_usage_history(chat_id);

-- Index for ordering by time
CREATE INDEX IF NOT EXISTS idx_token_usage_history_created_at
ON token_usage_history(created_at DESC);

-- Enable RLS
ALTER TABLE token_usage_history ENABLE ROW LEVEL SECURITY;

-- Policy for token_usage_history
CREATE POLICY "Allow all operations on token_usage_history"
ON "public"."token_usage_history"
AS PERMISSIVE
FOR ALL
TO public
USING (true);

-- Add comment
COMMENT ON TABLE token_usage_history IS 'Permanent record of all token usage. Survives message deletion to maintain accurate total token count.';

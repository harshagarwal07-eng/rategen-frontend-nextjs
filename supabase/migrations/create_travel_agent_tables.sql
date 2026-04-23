-- Travel Agent Chat Tables

-- Table: travel_agent_chats
CREATE TABLE IF NOT EXISTS travel_agent_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dmc_id UUID REFERENCES dmcs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  agent_state JSONB DEFAULT '{}'::jsonb,
  total_tokens INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: travel_agent_messages
CREATE TABLE IF NOT EXISTS travel_agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES travel_agent_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: agent_steps
CREATE TABLE IF NOT EXISTS agent_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES travel_agent_chats(id) ON DELETE CASCADE,
  message_id UUID REFERENCES travel_agent_messages(id) ON DELETE SET NULL,
  step_type TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  input JSONB DEFAULT '{}'::jsonb,
  output JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  retryable BOOLEAN DEFAULT true
);

-- Table: mcp_calls
CREATE TABLE IF NOT EXISTS mcp_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES travel_agent_chats(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES agent_steps(id) ON DELETE CASCADE,
  mcp_name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB,
  http_status INTEGER,
  error_message TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_travel_agent_messages_chat_id ON travel_agent_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_travel_agent_messages_created_at ON travel_agent_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_steps_chat_id ON agent_steps(chat_id);
CREATE INDEX IF NOT EXISTS idx_agent_steps_status ON agent_steps(status);
CREATE INDEX IF NOT EXISTS idx_mcp_calls_chat_id ON mcp_calls(chat_id);
CREATE INDEX IF NOT EXISTS idx_mcp_calls_step_id ON mcp_calls(step_id);

-- RLS Policies (adjust based on your auth setup)
ALTER TABLE travel_agent_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_calls ENABLE ROW LEVEL SECURITY;

-- Policy for travel_agent_chats
CREATE POLICY "Allow all operations on travel_agent_chats"
ON "public"."travel_agent_chats"
AS PERMISSIVE
FOR ALL
TO public
USING (true);

-- Policy for travel_agent_messages
CREATE POLICY "Allow all operations on travel_agent_messages"
ON "public"."travel_agent_messages"
AS PERMISSIVE
FOR ALL
TO public
USING (true);

-- Policy for agent_steps
CREATE POLICY "Allow all operations on agent_steps"
ON "public"."agent_steps"
AS PERMISSIVE
FOR ALL
TO public
USING (true);

-- Policy for mcp_calls
CREATE POLICY "Allow all operations on mcp_calls"
ON "public"."mcp_calls"
AS PERMISSIVE
FOR ALL
TO public
USING (true);

-- Table: pinned_messages
CREATE TABLE IF NOT EXISTS pinned_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES travel_agent_chats(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pinned_messages_chat_id ON pinned_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_message_id ON pinned_messages(message_id);

-- Enable RLS for pinned_messages
ALTER TABLE pinned_messages ENABLE ROW LEVEL SECURITY;

-- Policy for pinned_messages
CREATE POLICY "Allow all operations on pinned_messages"
ON "public"."pinned_messages"
AS PERMISSIVE
FOR ALL
TO public
USING (true);
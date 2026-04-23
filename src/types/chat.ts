export type Message = {
  id: string;
  content: string;
  role: "user" | "assistant";
  created_at: string;
};

export type Chat = {
  id: string;
  name: string;
};

export type ChatWithVersions = {
  active_rate_version: number;
  total_rate_versions: number;
  active_quote_version: number;
  total_quote_versions: number;
  id: string;
  title: string;
  pending_message?: string;
};

// Import UIMessage from LangGraph SDK
import type { UIMessage } from "@langchain/langgraph-sdk/react-ui/server";

// Re-export UIMessage for convenience
export type { UIMessage };

// Travel Agent Chat Types
export interface TravelAgentMessage {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata?: {
    tool_calls?: any[];
    model_used?: string;
    step_id?: string;
    thinking?: string;
    completion_time?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    ui?: UIMessage[]; // LangGraph SDK pattern
    suggested_actions?: string[];
  };
  tokens_used?: number;
  created_at: string;
  // Message versioning for regenerate branching
  version?: number; // 1, 2, 3... (for assistant messages)
  parent_message_id?: string; // References the user message this is responding to
}

export interface TravelAgentChat {
  id: string;
  created_at: string;
  dmc_id?: string;
  query_id?: string; // Links AI chat to a CRM query (1:1 relationship)
  title: string;
  agent_state?: Record<string, any>;
  total_tokens: number;
  status: "active" | "completed" | "failed";
  last_message_at: string;
  pinned?: boolean;
  deleted_at?: string | null;
}

// Token Usage History
export interface TokenUsageHistory {
  id: string;
  chat_id: string;
  created_at: string;
  user_message_text: string;
  tokens_used: number;
  model_used?: string;
}

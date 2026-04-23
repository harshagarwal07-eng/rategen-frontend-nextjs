"use client";

import { MessageInputSection } from "@/components/crm/shared/message-input-section";

interface AgentMessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export function AgentMessageInput({
  onSendMessage,
  disabled = false,
}: AgentMessageInputProps) {
  return <MessageInputSection onSendMessage={onSendMessage} disabled={disabled} />;
}

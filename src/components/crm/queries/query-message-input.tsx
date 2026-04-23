"use client";

import { MessageInputSection } from "@/components/crm/shared/message-input-section";

interface QueryMessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export function QueryMessageInput({
  onSendMessage,
  disabled = false,
}: QueryMessageInputProps) {
  return <MessageInputSection onSendMessage={onSendMessage} disabled={disabled} />;
}

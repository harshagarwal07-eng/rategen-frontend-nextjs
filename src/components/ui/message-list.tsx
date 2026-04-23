import {
  ChatMessage,
  type ChatMessageProps,
  type Message,
} from "@/components/ui/chat-message";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { ChatWithVersions } from "@/types/chat";

type AdditionalMessageOptions = Omit<ChatMessageProps, keyof Message | "chat">;

interface MessageListProps {
  messages: Message[];
  showTimeStamps?: boolean;
  isTyping?: boolean;
  messageOptions?:
    | AdditionalMessageOptions
    | ((message: Message) => AdditionalMessageOptions);
  isGenerating?: boolean;
  chat: ChatWithVersions;
}

export function MessageList({
  messages,
  showTimeStamps = true,
  isTyping = false,
  messageOptions,
  isGenerating = false,
  chat,
}: MessageListProps) {
  return (
    <div className="p-4 space-y-6">
      {messages.map((message, index) => {
        const additionalOptions =
          typeof messageOptions === "function"
            ? messageOptions(message)
            : messageOptions;

        return (
          <ChatMessage
            key={index}
            showTimeStamp={showTimeStamps}
            chat={chat}
            {...message}
            {...additionalOptions}
          />
        );
      })}
      {(isTyping || isGenerating) && <TypingIndicator />}
    </div>
  );
}

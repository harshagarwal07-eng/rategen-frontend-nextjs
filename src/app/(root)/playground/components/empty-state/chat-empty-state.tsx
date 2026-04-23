"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import ChatInput from "../input/chat-input";

interface ChatEmptyStateProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  stopGeneration?: () => void;
}

export default function ChatEmptyState({
  inputValue,
  onInputChange,
  onSend,
  isLoading,
  stopGeneration,
}: ChatEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-[calc(100vw-16px)] md:max-w-3xl space-y-6 md:space-y-8">
        {/* Greeting */}
        <h1 className="text-2xl md:text-4xl font-normal text-center text-muted-foreground">
          Chat with <span className="text-primary font-bold">Skyla</span> 💬✨
        </h1>

        {/* Input Box */}
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSend={onSend}
          isLoading={isLoading}
          stopGeneration={stopGeneration}
        />

        {/* Prompt Buttons */}
        {/* <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2">
            <span>?</span>
            How to
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="w-3 h-3" />
            Explain Concepts
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <span>✏️</span>
            Creative
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <span>💡</span>
            Advice
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <span>📊</span>
            Analysis
          </Button>
        </div> */}
      </div>
    </div>
  );
}

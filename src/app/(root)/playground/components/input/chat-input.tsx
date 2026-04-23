"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  disabled?: boolean;
  stopGeneration?: () => void;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  disabled = false,
  stopGeneration,
}: ChatInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div ref={containerRef} className={cn("border rounded-xl bg-background shadow overflow-hidden")}>
      <Textarea
        placeholder="Ask anything"
        className={cn(
          "w-full resize-none border-0 focus-visible:ring-0 text-base px-4 transition-all duration-300",
          isLoading && "max-h-24"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading || disabled}
      />
      <div className="flex items-center justify-end px-2 md:px-4 py-2 border-t border-dashed animate-in fade-in slide-in-from-top-1 duration-200">
        {isLoading && stopGeneration ? (
          <Button onClick={stopGeneration} size="icon" variant="destructive" className="h-8 w-8 rounded-full">
            <Loader2 className="w-4 h-4 animate-spin" />
          </Button>
        ) : (
          <Button onClick={onSend} disabled={!value.trim()} size="icon" className="h-8 w-8 rounded-full">
            <ArrowUp className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

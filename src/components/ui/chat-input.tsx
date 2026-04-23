"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpIcon } from "lucide-react";
import type React from "react";
import { createContext, useContext, useRef } from "react";
import TiptapEditor from "../editor/TiptapEditor";

interface ChatInputContextValue {
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  onSubmit?: () => void;
  loading?: boolean;
  onStop?: () => void;
  variant?: "default" | "unstyled";
  rows?: number;
}

const ChatInputContext = createContext<ChatInputContextValue>({});

interface ChatInputProps extends Omit<ChatInputContextValue, "variant"> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "unstyled";
  rows?: number;
}

function ChatInput({
  children,
  className,
  variant = "default",
  value,
  onChange,
  onSubmit,
  loading,
  onStop,
  rows = 1,
}: ChatInputProps) {
  const contextValue: ChatInputContextValue = {
    value,
    onChange,
    onSubmit,
    loading,
    onStop,
    variant,
    rows,
  };

  return (
    <ChatInputContext.Provider value={contextValue}>
      <div
        className={cn(
          variant === "default" &&
            "flex flex-col items-end w-full p-2 rounded-2xl border border-input bg-transparent focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:outline-none",
          variant === "unstyled" && "flex items-start gap-2 w-full",
          className
        )}
      >
        {children}
      </div>
    </ChatInputContext.Provider>
  );
}

ChatInput.displayName = "ChatInput";

interface Props {
  value?: string;
  onChange: (content: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}

function ChatInputTextArea({
  onSubmit: onSubmitProp,
  value: valueProp,
  onChange: onChangeProp,
  placeholder,
  className,
}: Props) {
  const context = useContext(ChatInputContext);
  const value = valueProp ?? context.value ?? "";
  const onChange = onChangeProp ?? context.onChange;
  const onSubmit = onSubmitProp ?? context.onSubmit;

  const editorRef = useRef<any>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onSubmit) {
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      if (typeof value !== "string" || value.trim().length === 0) {
        return;
      }
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <TiptapEditor
      onChange={onChange}
      editorRef={editorRef}
      placeholder={placeholder}
      onKeyDown={handleKeyDown}
      noToolbar
      className={className}
    />
    // <Textarea
    //   ref={textareaRef}
    //   {...props}
    //   value={value}
    //   onChange={onChange}
    //   onKeyDown={handleKeyDown}
    //   className={cn(
    //     "max-h-[400px] min-h-0 resize-none overflow-x-hidden",
    //     variant === "unstyled" &&
    //       "border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none",
    //     className
    //   )}
    //   rows={rows}
    // />
  );
}

ChatInputTextArea.displayName = "ChatInputTextArea";

interface ChatInputSubmitProps extends React.ComponentProps<typeof Button> {
  onSubmit?: () => void;
  loading?: boolean;
  onStop?: () => void;
}

function ChatInputSubmit({
  onSubmit: onSubmitProp,
  loading: loadingProp,
  onStop: onStopProp,
  className,
  ...props
}: ChatInputSubmitProps) {
  const context = useContext(ChatInputContext);
  const loading = loadingProp ?? context.loading;
  const onStop = onStopProp ?? context.onStop;
  const onSubmit = onSubmitProp ?? context.onSubmit;

  if (loading && onStop) {
    return (
      <Button
        onClick={onStop}
        className={cn(
          "shrink-0 rounded-full border dark:border-zinc-600",
          className
        )}
        size="icon"
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-label="Stop"
        >
          <title>Stop</title>
          <rect x="6" y="6" width="12" height="12" />
        </svg>
      </Button>
    );
  }

  const isDisabled =
    typeof context.value !== "string" || context.value.trim().length === 0;

  return (
    <Button
      className={cn(
        "shrink-0 rounded-full border dark:border-zinc-600",
        className
      )}
      size="icon"
      disabled={isDisabled}
      onClick={(event) => {
        event.preventDefault();
        if (!isDisabled) {
          onSubmit?.();
        }
      }}
      {...props}
    >
      <ArrowUpIcon />
    </Button>
  );
}

ChatInputSubmit.displayName = "ChatInputSubmit";

export { ChatInput, ChatInputTextArea, ChatInputSubmit };

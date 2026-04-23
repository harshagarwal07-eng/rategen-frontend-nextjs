"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { useAutosizeTextArea } from "@/hooks/use-autosize-textarea";
import { Textarea } from "./textarea";

/* ---------------------------------- Types --------------------------------- */

interface MessageMarkdownProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  rightIcon?: React.ReactNode;
}

/* ----------------------------- MessageMarkdown ----------------------------- */

export function MessageMarkdown({
  placeholder = "Enter examples...",
  className,
  disabled,
  rightIcon,
  ...props
}: MessageMarkdownProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useAutosizeTextArea({
    ref: textAreaRef as React.RefObject<HTMLTextAreaElement>,
    maxHeight: 240,
    borderWidth: 1,
    dependencies: [props.value],
  });

  return (
    <Textarea
      ref={textAreaRef}
      aria-label="Enter examples"
      placeholder={placeholder}
      disabled={disabled}
      rightIcon={rightIcon}
      className={cn("grow resize-none", className)}
      {...props}
    />
  );
}

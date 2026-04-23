"use client";

import { useState } from "react";
import { CrmRichTextEditor } from "./crm-richtext-editor";
import { Button } from "@/components/ui/button";
import { SendHorizonal } from "lucide-react";

type Props = {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
};

export const MessageInputSection = ({
  onSendMessage,
  disabled = false,
}: Props) => {
  const [content, setContent] = useState("");
  const [textContent, setTextContent] = useState("");

  const handleSend = () => {
    if (!textContent.trim() || disabled) return;

    onSendMessage(content);
    setContent(""); // Clear editor after sending
  };

  return (
    <div className="bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-6 py-2">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-2 relative">
          <CrmRichTextEditor
            content={content}
            onValueChange={setContent}
            onTextChange={setTextContent}
            placeholder="Write your message..."
            onSubmit={handleSend}
          />

          <Button
            size="icon"
            onClick={handleSend}
            disabled={!textContent.trim() || disabled}
            className="absolute bottom-2 right-2 rounded-full bg-primary/10 text-primary hover:text-primary-foreground"
          >
            <SendHorizonal />
          </Button>
        </div>
      </div>
    </div>
  );
};

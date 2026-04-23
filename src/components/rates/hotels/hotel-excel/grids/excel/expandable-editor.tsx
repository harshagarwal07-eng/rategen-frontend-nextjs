"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface ExpandableEditorProps {
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
  cellWidth?: number;
}

export function ExpandableEditor({ value, onSave, onClose, cellWidth }: ExpandableEditorProps) {
  const [text, setText] = useState(value ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at end
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        // Ctrl+Enter to save
        e.preventDefault();
        onSave(text);
        onClose();
      }
    },
    [text, onSave, onClose],
  );

  // Save and close
  const handleSave = useCallback(() => {
    onSave(text);
    onClose();
  }, [text, onSave, onClose]);

  const width = Math.max(cellWidth || 300, 350);

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <Popover open modal={false}>
        <PopoverTrigger asChild>
          <div className="w-full h-full" />
        </PopoverTrigger>
        <PopoverContent
          className="p-0"
          align="start"
          sideOffset={-28}
          style={{ width: `${width}px` }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onFocusOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="flex flex-col">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onWheel={(e) => e.stopPropagation()}
              className="w-full h-96 p-3 text-sm resize-none border-0 outline-none focus:ring-0"
              placeholder="Enter text... (Ctrl+Enter to save, Esc to cancel)"
            />
            <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
              <span className="text-xs text-muted-foreground">Ctrl+Enter to save, Esc to cancel</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleSave}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

"use client";

import { useEditorState } from "@tiptap/react";
import { Bold, Italic, Strikethrough, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/core";

interface SelectionToolbarProps {
  editor: Editor;
}

export function SelectionToolbar({ editor }: SelectionToolbarProps) {
  const { isTextSelected, isBold, isItalic, isStrike, isCode } = useEditorState({
    editor,
    selector: (ctx) => ({
      isTextSelected: !ctx.editor.state.selection.empty,
      isBold: ctx.editor.isActive("bold"),
      isItalic: ctx.editor.isActive("italic"),
      isStrike: ctx.editor.isActive("strike"),
      isCode: ctx.editor.isActive("code"),
    }),
  });

  if (!isTextSelected) return null;

  const buttons = [
    { label: "Bold",          icon: Bold,          action: () => editor.chain().focus().toggleBold().run(),   isActive: isBold },
    { label: "Italic",        icon: Italic,        action: () => editor.chain().focus().toggleItalic().run(), isActive: isItalic },
    { label: "Strikethrough", icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), isActive: isStrike },
    { label: "Monospace",     icon: Code,          action: () => editor.chain().focus().toggleCode().run(),   isActive: isCode },
  ];

  return (
    <div className="absolute -top-9 left-0 z-50 flex items-center gap-0.5 rounded-xl border bg-popover shadow-md px-1 py-0.5">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); btn.action(); }}
          aria-label={btn.label}
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded-lg transition-colors",
            "hover:bg-muted text-muted-foreground hover:text-foreground",
            btn.isActive && "bg-primary/10 text-primary"
          )}
        >
          <btn.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

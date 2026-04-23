"use client";

import { useEditorState } from "@tiptap/react";
import { Bold, Italic, Strikethrough, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/core";

interface FormattingToolbarProps {
  editor: Editor;
}

export function FormattingToolbar({ editor }: FormattingToolbarProps) {
  const { isBold, isItalic, isStrike, isCode } = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive("bold"),
      isItalic: ctx.editor.isActive("italic"),
      isStrike: ctx.editor.isActive("strike"),
      isCode: ctx.editor.isActive("code"),
    }),
  });

  const buttons = [
    { label: "Bold",          icon: Bold,          action: () => editor.chain().focus().toggleBold().run(),   isActive: isBold },
    { label: "Italic",        icon: Italic,        action: () => editor.chain().focus().toggleItalic().run(), isActive: isItalic },
    { label: "Strikethrough", icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), isActive: isStrike },
    { label: "Monospace",     icon: Code,          action: () => editor.chain().focus().toggleCode().run(),   isActive: isCode },
  ];

  return (
    <div className="flex items-center gap-0.5 px-2.5 py-1.5 border-t border-zinc-100 dark:border-zinc-700">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); btn.action(); }}
          aria-label={btn.label}
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded-lg transition-colors",
            "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700",
            btn.isActive && "text-emerald-600 bg-emerald-500/10 dark:bg-emerald-500/20"
          )}
        >
          <btn.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

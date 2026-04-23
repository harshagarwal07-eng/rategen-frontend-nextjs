"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useImperativeHandle, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { getWhatsAppText } from "./compose/whatsapp-serializer";
import { SelectionToolbar } from "./compose/selection-toolbar";
import { FormattingToolbar } from "./compose/formatting-toolbar";

export interface WhatsAppRichInputRef {
  clear: () => void;
  focus: () => void;
}

interface WhatsAppRichInputProps {
  onChange: (whatsAppText: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

const WhatsAppRichInput = forwardRef<WhatsAppRichInputRef, WhatsAppRichInputProps>(
  ({ onChange, onSubmit, placeholder = "Message…", disabled = false }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
        }),
      ],
      editable: !disabled,
      immediatelyRender: false,
      editorProps: {
        attributes: { "data-placeholder": placeholder, class: "outline-none" },
        handleKeyDown(_, event) {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
            return true;
          }
          return false;
        },
      },
      onUpdate({ editor }) {
        onChange(getWhatsAppText(editor));
      },
    });

    useImperativeHandle(ref, () => ({
      clear: () => editor?.commands.clearContent(true),
      focus: () => editor?.commands.focus(),
    }));

    useEffect(() => {
      editor?.setEditable(!disabled);
    }, [editor, disabled]);

    if (!editor) return null;

    return (
      <div className="relative flex-1">
        <SelectionToolbar editor={editor} />

        <div
          className={cn(
            "w-full rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700",
            "focus-within:border-emerald-500/50 transition-colors shadow-sm",
            disabled && "opacity-50 pointer-events-none"
          )}
        >
          <EditorContent
            editor={editor}
            className={cn(
              // Kill prose margins — just raw text rendering
              "[&_.ProseMirror]:outline-none",
              "[&_.ProseMirror]:min-h-[40px] [&_.ProseMirror]:max-h-[120px]",
              "[&_.ProseMirror]:overflow-y-auto",
              "[&_.ProseMirror]:px-4 [&_.ProseMirror]:pt-[10px] [&_.ProseMirror]:pb-0",
              "[&_.ProseMirror]:text-[13.5px] [&_.ProseMirror]:leading-[1.45]",
              "[&_.ProseMirror_p]:m-0 [&_.ProseMirror_p]:p-0",
              // Placeholder
              "[&_.ProseMirror.is-editor-empty:before]:content-[attr(data-placeholder)]",
              "[&_.ProseMirror.is-editor-empty:before]:text-muted-foreground/50",
              "[&_.ProseMirror.is-editor-empty:before]:text-[13.5px]",
              "[&_.ProseMirror.is-editor-empty:before]:pointer-events-none",
              "[&_.ProseMirror.is-editor-empty:before]:float-left",
              "[&_.ProseMirror.is-editor-empty:before]:h-0"
            )}
          />
          <FormattingToolbar editor={editor} />
        </div>
      </div>
    );
  }
);

WhatsAppRichInput.displayName = "WhatsAppRichInput";

export { WhatsAppRichInput };

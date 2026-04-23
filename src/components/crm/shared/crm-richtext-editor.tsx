"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { cn } from "@/lib/tiptap-utils";
import { useEffect, useRef } from "react";
import { Bold, Italic, UnderlineIcon, List } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  editorClassName?: string;
  onValueChange?: (value: string) => void;
  onTextChange?: (text: string) => void;
  content?: string;
  placeholder?: string;
  onSubmit?: () => void;
  readOnly?: boolean;
};

export const CrmRichTextEditor = ({
  editorClassName,
  onValueChange,
  onTextChange,
  content,
  placeholder = "Write your message...",
  onSubmit,
  readOnly = false,
}: Props) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { HTMLAttributes: { class: "list-disc ml-3" } },
        orderedList: { HTMLAttributes: { class: "list-decimal ml-3" } },
      }),
      Underline,
    ],
    editable: !readOnly,
    content,
    immediatelyRender: false,

    onUpdate: ({ editor }) => {
      onValueChange?.(editor.getHTML());
      onTextChange?.(editor.getText());

      // Auto-scroll to bottom when content changes
      if (editorContainerRef.current) {
        const container = editorContainerRef.current;
        container.scrollTop = container.scrollHeight;
      }
    },
  });

  useEffect(() => {
    if (editor && content === "") {
      editor.commands.clearContent();
    }
  }, [editor, content]);

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        onSubmit?.();
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener("keydown", handleKeyDown);

    return () => {
      editorElement.removeEventListener("keydown", handleKeyDown);
    };
  }, [editor, onSubmit]);

  if (!editor) return null;

  const menuOptions = [
    {
      icon: Bold,
      onClick: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
      label: "Bold",
    },
    {
      icon: Italic,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
      label: "Italic",
    },
    {
      icon: UnderlineIcon,
      onClick: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive("underline"),
      label: "Underline",
    },
    {
      icon: List,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
      label: "Bullet List",
    },
  ];

  return (
    <div
      className={cn(
        "disabled:opacity-50 placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none text-foreground disabled:cursor-not-allowed w-full no-scrollbar relative group",
        !readOnly &&
          "border border-input shadow-sm rounded-xl hover:shadow-md has-focus:ring-2 has-focus:ring-primary/20 has-focus:border-primary"
      )}
    >
      <EditorContent
        editor={editor}
        ref={editorContainerRef}
        className={cn(
          "border-0 max-w-none prose prose-sm dark:prose-invert transition-all duration-200",
          "[&_div]:outline-0 [&_.ProseMirror]:outline-none [&_.ProseMirror]:caret-foreground",
          "[&_.ProseMirror]:cursor-text",
          !readOnly
            ? "pt-2 pl-3 pb-10 pr-12 overflow-y-auto max-h-40 no-scrollbar [&_.ProseMirror]:min-h-7"
            : "p-0",
          editorClassName
        )}
        placeholder={placeholder}
      />
      {!readOnly && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 pb-2 bg-background/95 backdrop-blur-sm rounded-b-xl transition-all duration-200 group-hover:bg-background">
          <div className="flex items-center gap-0.5">
            {menuOptions.map((option, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={option.onClick}
                className={cn(
                  "h-7 w-7 p-0 transition-all duration-200",
                  "hover:bg-primary/10 hover:text-primary hover:scale-105",
                  "focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1",
                  "active:scale-95",
                  option.isActive &&
                    "bg-primary/15 text-primary shadow-sm hover:bg-primary/20"
                )}
                title={option.label}
              >
                <option.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { useEffect, useImperativeHandle, forwardRef } from "react";
import TiptapToolbar from "./TiptapToolbar";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  onChange?: (content: string) => void;
  initialContent?: string;
  placeholder?: string;
  editorRef?: React.MutableRefObject<any>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  noToolbar?: boolean;
  className?: string;
  readOnly?: boolean;
}

const TiptapEditor = forwardRef<any, TiptapEditorProps>(
  (
    {
      onChange,
      initialContent,
      placeholder,
      editorRef,
      onKeyDown,
      noToolbar = false,
      className,
      readOnly = false,
    },
    ref
  ) => {
    const editor = useEditor(
      {
        extensions: [
          StarterKit.configure({
            codeBlock: false,
            bulletList: false,
            orderedList: false,
            listItem: false,
          }),
          Link.configure({
            openOnClick: false,
            HTMLAttributes: {
              class: "text-blue-500 underline cursor-pointer",
            },
          }),
          TextAlign.configure({
            types: ["heading", "paragraph"],
          }),
          Underline,
          TextStyle,
          Color,
          Highlight.configure({
            multicolor: true,
          }),
          Typography,
          Table.configure({
            resizable: true,
            HTMLAttributes: {
              class: "border-collapse table-auto w-full",
            },
          }),
          TableRow.configure({
            HTMLAttributes: {
              class: "border border-primary",
            },
          }),
          TableHeader.configure({
            HTMLAttributes: {
              class: "border border-primary bg-muted px-3 py-2 text-left",
            },
          }),
          TableCell.configure({
            HTMLAttributes: {
              class: "border border-primary px-3 py-2 text-left",
            },
          }),
          HorizontalRule.configure({
            HTMLAttributes: {
              class: "my-2",
            },
          }),
          ListItem.configure({
            HTMLAttributes: {
              class: "list-item",
            },
          }),
          BulletList.configure({
            keepMarks: true,
            HTMLAttributes: {
              class: "list-disc",
            },
          }),
          OrderedList.configure({
            keepMarks: true,
            HTMLAttributes: {
              class: "list-decimal",
            },
          }),
        ],
        content: initialContent || "",
        onUpdate: ({ editor }) => {
          const html = editor.getHTML();
          onChange?.(html);
        },
        immediatelyRender: false,
        editorProps: {
          editable: () => {
            return !readOnly;
          },
          attributes: {
            class: cn(
              "min-h-[200px] outline-none prose prose-sm max-w-none p-3 rich-text",
              readOnly && "bg-muted rounded-lg min-h-0"
            ),
          },
        },
      },
      [initialContent]
    );

    // Expose editor instance through ref
    useImperativeHandle(
      ref,
      () => ({
        setContent: (content: string) => {
          editor?.commands.setContent(content);
        },
        getContent: () => editor?.getHTML() || "",
        editor,
      }),
      [editor]
    );

    // Update editorRef if provided
    useEffect(() => {
      if (editorRef && editor) {
        editorRef.current = {
          setContent: (content: string) => {
            editor.commands.setContent(content);
          },
          getContent: () => editor.getHTML() || "",
          editor,
        };
      }
    }, [editor, editorRef]);

    if (!editor) {
      return null;
    }

    return (
      <div
        className={cn(
          "border-2 border-input/30 h-full bg-card divide-y rounded-lg",
          className
        )}
      >
        {!noToolbar && <TiptapToolbar editor={editor} />}
        <div className="relative">
          <EditorContent editor={editor} onKeyDown={onKeyDown} />
          {!editor.getText() && placeholder && (
            <div className="absolute top-3 left-3 text-muted-foreground pointer-events-none">
              {placeholder}
            </div>
          )}
        </div>
      </div>
    );
  }
);

TiptapEditor.displayName = "TiptapEditor";

export default TiptapEditor;

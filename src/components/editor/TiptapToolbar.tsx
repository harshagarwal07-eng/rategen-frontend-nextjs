"use client";

import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link as LinkIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Pencil,
  Table,
  Minus,
  Palette,
} from "lucide-react";
import { useState, useCallback } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TiptapTool =
  | "undo"
  | "redo"
  | "blockSelect"
  | "bulletList"
  | "orderedList"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "color"
  | "link"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "alignJustify"
  | "table"
  | "divider";

interface TiptapToolbarProps {
  editor: Editor;
  tools?: TiptapTool[];
}

function isAllowed(name: TiptapTool, tools?: TiptapTool[]): boolean {
  if (!tools) return true;
  return tools.includes(name);
}

function Divider(): React.ReactElement {
  return <div className="h-6 w-px bg-gray-300 mx-2" />;
}

interface FloatingLinkEditorProps {
  editor: Editor;
  onClose: () => void;
}

function FloatingLinkEditor({ editor, onClose }: FloatingLinkEditorProps) {
  const [url, setUrl] = useState("");
  const [isEditMode, setEditMode] = useState(false);

  const currentUrl = editor.getAttributes("link").href || "";

  const handleSetLink = () => {
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    onClose();
  };

  const handleEdit = () => {
    setUrl(currentUrl);
    setEditMode(true);
  };

  if (isEditMode) {
    return (
      <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-2 flex items-center">
        <input
          className="w-full border-none px-2 py-1 focus:outline-none"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSetLink();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditMode(false);
              onClose();
            }
          }}
          placeholder="Enter URL"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-2 flex items-center">
      <a
        href={currentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-700 text-sm mr-2 overflow-hidden whitespace-nowrap text-ellipsis max-w-xs"
      >
        {currentUrl}
      </a>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleEdit}
        type="button"
        aria-label="Edit link"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}

function TiptapToolbar({ editor, tools }: TiptapToolbarProps) {
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const show = (name: TiptapTool) => isAllowed(name, tools);
  const showAlignGroup =
    show("alignLeft") || show("alignCenter") || show("alignRight") || show("alignJustify");
  const showInsertGroup = show("table") || show("divider");
  const showFormatGroup =
    show("bold") || show("italic") || show("underline") || show("strike") || show("color") || show("link");
  const showListGroup = show("bulletList") || show("orderedList");
  const showHistoryGroup = show("undo") || show("redo");

  const getCurrentBlockType = () => {
    if (editor.isActive("heading", { level: 1 })) return "Large Heading";
    if (editor.isActive("heading", { level: 2 })) return "Small Heading";
    if (editor.isActive("bulletList")) return "Bullet List";
    if (editor.isActive("orderedList")) return "Numbered List";
    if (editor.isActive("blockquote")) return "Quote";
    return "Normal";
  };

  const insertLink = useCallback(() => {
    const isActive = editor.isActive("link");
    if (isActive) {
      setShowLinkEditor(true);
    } else {
      const url = window.prompt("Enter URL");
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
  }, [editor]);

  const insertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const insertDivider = () => {
    editor.chain().focus().setHorizontalRule().run();
  };

  return (
    <div className="flex items-center p-2 border-b sticky top-0 z-10 bg-white dark:bg-muted rounded-t-lg">
      {show("undo") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={!editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
              className={`h-8 w-8 ${!editor.can().undo() ? "opacity-30" : ""}`}
              aria-label="Undo"
              type="button"
            >
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>
      )}

      {show("redo") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={!editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
              className={`h-8 w-8 ${!editor.can().redo() ? "opacity-30" : ""}`}
              aria-label="Redo"
              type="button"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>
      )}

      {showHistoryGroup && show("blockSelect") && <Divider />}

      {show("blockSelect") && <Select
        value={getCurrentBlockType()}
        onValueChange={(value) => {
          switch (value) {
            case "Normal":
              editor.chain().focus().clearNodes().run();
              break;
            case "Large Heading":
              editor.chain().focus().toggleHeading({ level: 1 }).run();
              break;
            case "Small Heading":
              editor.chain().focus().toggleHeading({ level: 2 }).run();
              break;
            case "Bullet List":
              editor.chain().focus().toggleBulletList().run();
              break;
            case "Numbered List":
              editor.chain().focus().toggleOrderedList().run();
              break;
          }
        }}
      >
        <SelectTrigger className="w-40 h-6 border-none shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Normal">Normal</SelectItem>
          <SelectItem value="Large Heading">Large Heading</SelectItem>
          <SelectItem value="Small Heading">Small Heading</SelectItem>
          <SelectItem value="Bullet List">Bullet List</SelectItem>
          <SelectItem value="Numbered List">Numbered List</SelectItem>
        </SelectContent>
      </Select>}

      {show("blockSelect") && showListGroup && <Divider />}

      {show("bulletList") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${
                editor.isActive("bulletList") ? "bg-muted" : ""
              }`}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              aria-label="Bullet List"
              type="button"
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bullet List</TooltipContent>
        </Tooltip>
      )}

      {show("orderedList") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${
                editor.isActive("orderedList") ? "bg-muted" : ""
              }`}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              aria-label="Numbered List"
              type="button"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Numbered List</TooltipContent>
        </Tooltip>
      )}

      {showListGroup && showFormatGroup && <Divider />}

      {show("bold") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${
                editor.isActive("bold") ? "bg-muted" : ""
              }`}
              onClick={() => editor.chain().focus().toggleBold().run()}
              aria-label="Format Bold"
              type="button"
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bold</TooltipContent>
        </Tooltip>
      )}

      {show("italic") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${
                editor.isActive("italic") ? "bg-muted" : ""
              }`}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              aria-label="Format Italics"
              type="button"
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Italic</TooltipContent>
        </Tooltip>
      )}

      {show("underline") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${
                editor.isActive("underline") ? "bg-muted" : ""
              }`}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              aria-label="Format Underline"
              type="button"
            >
              <Underline className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Underline</TooltipContent>
        </Tooltip>
      )}

      {show("strike") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${
                editor.isActive("strike") ? "bg-muted" : ""
              }`}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              aria-label="Format Strikethrough"
              type="button"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Strikethrough</TooltipContent>
        </Tooltip>
      )}

      {show("color") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().unsetColor().run()}
              aria-label="Reset Text Color"
              type="button"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset Text Color</TooltipContent>
        </Tooltip>
      )}

      {show("link") && (
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${
                  editor.isActive("link") ? "bg-muted" : ""
                }`}
                onClick={insertLink}
                aria-label="Insert Link"
                type="button"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Link</TooltipContent>
          </Tooltip>

          {showLinkEditor && editor.isActive("link") && (
            <FloatingLinkEditor
              editor={editor}
              onClose={() => setShowLinkEditor(false)}
            />
          )}
        </div>
      )}

      {showFormatGroup && showAlignGroup && <Divider />}

      {show("alignLeft") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              aria-label="Left Align"
              type="button"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Left Align</TooltipContent>
        </Tooltip>
      )}

      {show("alignCenter") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              aria-label="Center Align"
              type="button"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Center Align</TooltipContent>
        </Tooltip>
      )}

      {show("alignRight") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              aria-label="Right Align"
              type="button"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Right Align</TooltipContent>
        </Tooltip>
      )}

      {show("alignJustify") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
              aria-label="Justify Align"
              type="button"
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Justify Align</TooltipContent>
        </Tooltip>
      )}

      {showAlignGroup && showInsertGroup && <Divider />}

      {show("table") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={insertTable}
              aria-label="Insert Table"
              type="button"
            >
              <Table className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Table</TooltipContent>
        </Tooltip>
      )}

      {show("divider") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={insertDivider}
              aria-label="Insert Divider"
              type="button"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Divider</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export default TiptapToolbar;

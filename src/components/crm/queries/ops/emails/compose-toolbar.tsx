"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Send, Save, Paperclip, Trash2, Loader2,
  Bold, Italic, Underline, Link2, List, ListOrdered, Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EMOJI_LIST = [
  "😊","😂","❤️","👍","🙏","🔥","✅","📧","📎","🎉",
  "👋","🤝","💡","⚡","🚀","📌","🗓️","💬","✍️","📝",
];

function ToolbarBtn({
  icon: Icon, label, onClick, active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon"
          className={cn("h-7 w-7", active && "bg-muted text-foreground")}
          onClick={onClick}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

interface ComposeToolbarProps {
  editor: Editor | null;
  isSending: boolean;
  isSavingDraft: boolean;
  isDraftEdit: boolean;
  toEmpty: boolean;
  showLinkInput: boolean;
  onSaveDraft: () => void;
  onAttach: () => void;
  onDiscard: () => void;
  onToggleLink: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (files: FileList | null) => void;
}

export function ComposeToolbar({
  editor, isSending, isSavingDraft, isDraftEdit, toEmpty,
  showLinkInput, onSaveDraft, onAttach, onDiscard, onToggleLink,
  fileInputRef, onFileChange,
}: ComposeToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20 shrink-0">
      <div className="flex items-center gap-0.5">
        <Button type="submit" size="sm" disabled={isSending || toEmpty}
          className="gap-1.5 h-8 px-4 font-medium text-xs rounded-lg"
        >
          {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {isSending ? "Sending…" : "Send"}
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={isSavingDraft}
              className="gap-1.5 h-8 px-3 text-xs rounded-lg" onClick={onSaveDraft}
            >
              {isSavingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {isSavingDraft ? "Saving…" : isDraftEdit ? "Update draft" : "Save draft"}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{isDraftEdit ? "Update this draft" : "Save as draft"}</TooltipContent>
        </Tooltip>

        <div className="h-5 w-px bg-border mx-1.5" />

        <ToolbarBtn icon={Bold} label="Bold" active={!!editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()} />
        <ToolbarBtn icon={Italic} label="Italic" active={!!editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()} />
        <ToolbarBtn icon={Underline} label="Underline" active={!!editor?.isActive("underline")}
          onClick={() => editor?.chain().focus().toggleUnderline().run()} />
        <ToolbarBtn icon={Link2} label="Insert link" active={showLinkInput} onClick={onToggleLink} />
        <ToolbarBtn icon={List} label="Bullet list" active={!!editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()} />
        <ToolbarBtn icon={ListOrdered} label="Numbered list" active={!!editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()} />

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
              <Smile className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 z-300" align="start" side="top">
            <div className="grid grid-cols-5 gap-1">
              {EMOJI_LIST.map((emoji) => (
                <button key={emoji} type="button"
                  className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-base transition-colors"
                  onClick={() => editor?.chain().focus().insertContent(emoji).run()}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-0.5">
        <input ref={fileInputRef} type="file" multiple className="hidden"
          onChange={(e) => onFileChange(e.target.files)} />
        <ToolbarBtn icon={Paperclip} label="Attach files" onClick={onAttach} />
        <ToolbarBtn icon={Trash2} label="Discard" onClick={onDiscard} />
      </div>
    </div>
  );
}

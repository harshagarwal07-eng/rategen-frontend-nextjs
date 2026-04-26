"use client";

import ReactMarkdown from "react-markdown";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PdfMarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => {
            void navigator.clipboard.writeText(content);
            toast.success("Copied");
          }}
        >
          <Copy className="h-3 w-3" /> Copy markdown
        </Button>
      </div>
      <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-td:text-sm prose-th:text-sm prose-table:border-collapse prose-td:border prose-td:border-border prose-td:px-2 prose-td:py-1 prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-2 prose-th:py-1">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

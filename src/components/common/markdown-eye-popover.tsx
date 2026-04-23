import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EyeIcon } from "lucide-react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

type Props = {
  title: string;
  content: string;
};

export function MarkdownEyePopover({ title, content }: Props) {
  if (!content || content.trim() === "") {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <EyeIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-96 overflow-y-auto" align="end">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          <div className="prose prose-sm max-w-none">
            <Markdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                h1: ({ children, ...props }) => (
                  <h1 className="text-lg font-semibold mb-2" {...props}>
                    {children}
                  </h1>
                ),
                h2: ({ children, ...props }) => (
                  <h2 className="text-base font-semibold mb-2" {...props}>
                    {children}
                  </h2>
                ),
                h3: ({ children, ...props }) => (
                  <h3 className="text-sm font-semibold mb-1" {...props}>
                    {children}
                  </h3>
                ),
                p: ({ children, ...props }) => (
                  <p className="text-xs mb-2 leading-relaxed" {...props}>
                    {children}
                  </p>
                ),
                ul: ({ children, ...props }) => (
                  <ul
                    className="list-disc list-inside text-xs space-y-1 mb-2"
                    {...props}
                  >
                    {children}
                  </ul>
                ),
                ol: ({ children, ...props }) => (
                  <ol
                    className="list-decimal list-inside text-xs space-y-1 mb-2"
                    {...props}
                  >
                    {children}
                  </ol>
                ),
                li: ({ children, ...props }) => (
                  <li className="text-xs" {...props}>
                    {children}
                  </li>
                ),
                strong: ({ children, ...props }) => (
                  <strong className="font-semibold" {...props}>
                    {children}
                  </strong>
                ),
                em: ({ children, ...props }) => (
                  <em className="italic" {...props}>
                    {children}
                  </em>
                ),
                code: ({ children, ...props }) => (
                  <code
                    className="bg-muted px-1 py-0.5 rounded text-xs"
                    {...props}
                  >
                    {children}
                  </code>
                ),
                blockquote: ({ children, ...props }) => (
                  <blockquote
                    className="border-l-2 border-muted pl-3 text-xs italic"
                    {...props}
                  >
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content}
            </Markdown>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

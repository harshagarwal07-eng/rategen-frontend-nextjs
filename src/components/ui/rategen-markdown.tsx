import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

type Props = {
  content: string;
  className?: string;
};

export default function RategenMarkdown({ content, className }: Props) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "[&_table]:block [&_table]:overflow-x-auto",
        "[&_table]:max-w-full [&_table]:-mx-2 [&_table]:px-2",
        isMobile && "[&_table]:whitespace-nowrap",
        className,
        className?.includes("text-sm") && "prose-p:text-sm",
        className?.includes("text-xs") && "prose-p:text-xs"
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

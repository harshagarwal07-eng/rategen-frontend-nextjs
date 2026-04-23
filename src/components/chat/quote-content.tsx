import { useQuery } from "@tanstack/react-query";
import { getQuoteByVersion } from "@/data-access/quotes";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

type Props = {
  version: number;
  chatId: string;
};

export default function QuoteContent({ version, chatId }: Props) {
  const {
    data: quote,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["quote", version, chatId],
    queryFn: () => getQuoteByVersion(version, chatId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading quote</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No quote available</p>
          <p className="text-sm text-muted-foreground">
            Quote version {version} has not been generated yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-4 max-w-3xl mx-auto text-sm">
      <div className="bg-background border rounded-lg p-6 flex-1 overflow-auto  text-sm">
        <MarkdownRenderer>{quote.markdown}</MarkdownRenderer>
      </div>
    </div>
  );
}

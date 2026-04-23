"use client";

import { useMemo, Fragment } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ServiceCard, type ServiceCardData } from "./service-card";

// =====================================================
// ENHANCED MARKDOWN WITH INLINE SERVICE CARDS
// =====================================================

// Marker pattern: <!-- SERVICE_CARD:{"type":"tour",...} -->
const SERVICE_CARD_PATTERN = /<!--\s*SERVICE_CARD:(.*?)\s*-->/g;

interface EnhancedMarkdownProps {
  content: string;
  className?: string;
  showPricing?: boolean;
  currency?: string;
}

interface ContentSegment {
  type: "text" | "card";
  content: string;
  cardData?: ServiceCardData;
}

/**
 * Parse content and extract service card markers
 */
function parseContentWithCards(
  content: string,
  showPricing: boolean,
  currency: string
): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  // Find all SERVICE_CARD markers
  const matches = content.matchAll(SERVICE_CARD_PATTERN);

  for (const match of matches) {
    // Add text before this marker
    if (match.index !== undefined && match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        segments.push({ type: "text", content: textBefore });
      }
    }

    // Parse card data
    try {
      const cardJson = match[1];
      const cardData = JSON.parse(cardJson) as ServiceCardData;

      // Apply global settings
      cardData.showPricing = showPricing;
      if (!cardData.currency) cardData.currency = currency;

      segments.push({
        type: "card",
        content: match[0],
        cardData,
      });
    } catch (e) {
      console.warn("[EnhancedMarkdown] Failed to parse card data:", match[1], e);
      // Keep the raw marker if parsing fails
      segments.push({ type: "text", content: match[0] });
    }

    lastIndex = (match.index || 0) + match[0].length;
  }

  // Add remaining text after last marker
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining.trim()) {
      segments.push({ type: "text", content: remaining });
    }
  }

  // If no markers found, return entire content as text
  if (segments.length === 0 && content.trim()) {
    segments.push({ type: "text", content });
  }

  return segments;
}

/**
 * Render markdown text segment
 */
function MarkdownSegment({ content, className }: { content: string; className?: string }) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "[&_table]:block [&_table]:overflow-x-auto",
        "[&_table]:max-w-full [&_table]:-mx-2 [&_table]:px-2",
        isMobile && "[&_table]:whitespace-nowrap",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</ReactMarkdown>
    </div>
  );
}

/**
 * Enhanced Markdown component with inline service cards
 *
 * Parses content for SERVICE_CARD markers and renders them inline:
 * <!-- SERVICE_CARD:{"type":"tour","name":"Valle Adventure Park",...} -->
 */
export default function EnhancedMarkdown({
  content,
  className,
  showPricing = true,
  currency = "USD",
}: EnhancedMarkdownProps) {
  // Parse content into segments (text and cards)
  const segments = useMemo(
    () => parseContentWithCards(content, showPricing, currency),
    [content, showPricing, currency]
  );

  // If no cards found, render as regular markdown
  if (segments.length === 1 && segments[0].type === "text") {
    return <MarkdownSegment content={content} className={className} />;
  }

  // Render mixed content with inline cards
  return (
    <div className={className}>
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {segment.type === "text" ? (
            <MarkdownSegment content={segment.content} />
          ) : segment.cardData ? (
            <ServiceCard data={segment.cardData} />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

// Export for use elsewhere
export { parseContentWithCards, type ContentSegment };

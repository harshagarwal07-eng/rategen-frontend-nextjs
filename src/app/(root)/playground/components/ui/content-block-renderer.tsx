"use client";

import type { ContentBlock, ServiceCardData } from "@/types/agent";
import RategenMarkdown from "@/components/ui/rategen-markdown";
import { ModernItinerary } from "./modern-itinerary";

/**
 * ContentBlockRenderer
 *
 * LangChain-style generative UI renderer that displays content blocks in order.
 * Supports interleaved markdown and day carousels for seamless inline rendering.
 *
 * Example block sequence:
 * [markdown: "## Day 1 – Arrival"]
 * [day-carousel: { day: 1, activities: [...] }]
 * [markdown: "## Day 2 – Tours"]
 * [day-carousel: { day: 2, activities: [...] }]
 */

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
  className?: string;
}

export function ContentBlockRenderer({
  blocks,
  className,
}: ContentBlockRendererProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {blocks.map((block, index) => (
        <ContentBlockItem key={index} block={block} />
      ))}
    </div>
  );
}

function ContentBlockItem({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "markdown":
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <RategenMarkdown content={block.content} />
        </div>
      );

    case "day-carousel":
      return (
        <div className="my-3">
          <ModernItinerary
            days={[
              {
                day: block.day,
                title: block.title,
                activities: block.activities as ServiceCardData[],
              },
            ]}
            showPricing={block.showPricing}
            currency={block.currency}
            hideHeader={true}
          />
        </div>
      );

    case "pricing-summary":
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert border-t pt-4 mt-4">
          <RategenMarkdown content={block.content} />
        </div>
      );

    default:
      // Exhaustive check - should never reach here
      const _exhaustive: never = block;
      console.warn("Unknown content block type:", block);
      return null;
  }
}

export default ContentBlockRenderer;

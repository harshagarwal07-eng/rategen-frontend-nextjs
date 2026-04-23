"use client";

import { useMemo } from "react";
import RategenMarkdown from "@/components/ui/rategen-markdown";
import { ModernItinerary, type ItineraryDayData } from "./modern-itinerary";

// =====================================================
// INLINE ITINERARY RENDERER
// Splits markdown by day sections and injects carousels inline
// =====================================================

interface InlineItineraryRendererProps {
  content: string;
  days: ItineraryDayData[];
  showPricing?: boolean;
  currency?: string;
}

/**
 * Splits markdown content and injects day carousels inline
 *
 * Example input:
 * "## Day 1 - Arrival\nSome text...\n## Day 2 - Tours\nMore text..."
 *
 * Renders:
 * [Markdown: Day 1 header + text]
 * [Carousel: Day 1 activities]
 * [Markdown: Day 2 header + text]
 * [Carousel: Day 2 activities]
 */
export function InlineItineraryRenderer({
  content,
  days,
  showPricing = false,
  currency = "USD",
}: InlineItineraryRendererProps) {
  // Create day lookup map
  const dayMap = useMemo(() => {
    const map = new Map<number, ItineraryDayData>();
    days.forEach((d) => map.set(d.day, d));
    return map;
  }, [days]);

  // Parse content into segments with day numbers
  const segments = useMemo(() => {
    if (!content) return [];

    // Pattern to match day headers in various formats:
    // "## Day 1", "**Day 1", "### Day 1:", "Day 1 –", etc.
    const dayPattern = /^(#{1,3}\s+)?\*{0,2}Day\s+(\d+)[^\n]*/gim;

    const result: Array<{ content: string; dayNumber: number | null }> = [];
    let lastIndex = 0;
    let match;

    // Find all day headers
    const matches: Array<{ index: number; fullMatch: string; dayNum: number }> = [];

    while ((match = dayPattern.exec(content)) !== null) {
      matches.push({
        index: match.index,
        fullMatch: match[0],
        dayNum: parseInt(match[2], 10),
      });
    }

    if (matches.length === 0) {
      // No day sections found, return content as-is
      return [{ content, dayNumber: null }];
    }

    // Process each match
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];

      // Content before first day (if any)
      if (i === 0 && current.index > 0) {
        const beforeContent = content.slice(0, current.index).trim();
        if (beforeContent) {
          result.push({ content: beforeContent, dayNumber: null });
        }
      }

      // Get content for this day section (from this header to next header or end)
      const endIndex = next ? next.index : content.length;
      const dayContent = content.slice(current.index, endIndex).trim();

      if (dayContent) {
        result.push({ content: dayContent, dayNumber: current.dayNum });
      }
    }

    return result;
  }, [content]);

  if (!content) return null;

  // If no days data, just render markdown
  if (days.length === 0) {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <RategenMarkdown content={content} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {segments.map((segment, index) => {
        const dayData = segment.dayNumber ? dayMap.get(segment.dayNumber) : null;
        const hasActivities = dayData && dayData.activities && dayData.activities.length > 0;

        return (
          <div key={index}>
            {/* Render markdown segment */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <RategenMarkdown content={segment.content} />
            </div>

            {/* Inject carousel right after this day's markdown */}
            {hasActivities && (
              <div className="my-3">
                <ModernItinerary
                  days={[dayData]}
                  showPricing={showPricing}
                  currency={currency}
                  hideHeader={true}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default InlineItineraryRenderer;

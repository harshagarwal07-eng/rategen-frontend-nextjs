/**
 * Content Block Builder
 *
 * Builds interleaved content blocks (markdown + UI) from structured data.
 * No parsing needed - we use the data we already have.
 *
 * This replaces the response-section-splitter approach which:
 * 1. Asked LLM to generate day-wise text
 * 2. Parsed text with regex to find "Day X"
 * 3. Injected carousels at parsed positions
 *
 * New approach:
 * 1. Build greeting block (template)
 * 2. Build guest details block (from query_info)
 * 3. For each day: emit day markdown + carousel (from itinerary data)
 * 4. Build AI remarks, pricing, terms blocks (from structured data)
 */

import type { ContentBlock, ServiceCardData } from "@/types/agent";

export interface DayData {
  day: number;
  date?: string;
  title: string;
  activities: ServiceCardData[];
  overnight?: string;
}

export interface GuestDetails {
  leadGuestName?: string;
  adults: number;
  children: number;
  childAges?: number[];
  startDate: string;
  endDate: string;
  nights: number;
  destination: string;
}

export interface PricingSummary {
  grandTotal: number;
  perAdult?: number;
  perChild?: number;
  currency: string;
  lineItems?: Array<{
    description: string;
    amount: number;
  }>;
}

export interface ContentBlockBuilderInput {
  dmcName: string;
  guestDetails: GuestDetails;
  days: DayData[];
  aiRemarks?: string[];
  pricing: PricingSummary;
  inclusions?: string[];
  exclusions?: string[];
  termsAndConditions?: string;
  showPricing: boolean;
  currency: string;
}

/**
 * Format date as "Friday, Feb 13, 2026"
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format pax string like "2 Adults, 3 Children"
 */
function formatPax(adults: number, children: number, childAges?: number[]): string {
  const parts: string[] = [];
  if (adults > 0) {
    parts.push(`${adults} Adult${adults > 1 ? "s" : ""}`);
  }
  if (children > 0) {
    const agesStr = childAges?.length ? ` (${childAges.join(", ")})` : "";
    parts.push(`${children} Child${children > 1 ? "ren" : ""}${agesStr}`);
  }
  return parts.join(", ");
}

/**
 * Stream content blocks via callback
 */
export function streamContentBlocks(
  blocks: ContentBlock[],
  streamCallback: (
    event: { type: "content-block"; block: ContentBlock } | { type: "text-chunk"; content: string }
  ) => void
): void {
  for (const block of blocks) {
    // Emit content-block event
    streamCallback({ type: "content-block", block });

    // Also emit text-chunk for backward compatibility (only for markdown blocks)
    if (block.type === "markdown") {
      block.content.split("\n").forEach((line) => {
        streamCallback({ type: "text-chunk", content: line + "\n" });
      });
    }
  }
}

/**
 * Convert content blocks to plain markdown string
 * (for storing in message content field)
 */
export function contentBlocksToMarkdown(blocks: ContentBlock[]): string {
  return blocks
    .filter((block) => block.type === "markdown" || block.type === "pricing-summary")
    .map((block) => {
      if (block.type === "markdown" || block.type === "pricing-summary") {
        return block.content;
      }
      return "";
    })
    .join("");
}

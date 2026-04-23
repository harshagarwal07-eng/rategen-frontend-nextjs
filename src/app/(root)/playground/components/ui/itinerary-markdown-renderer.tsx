"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DayActivitiesCarousel } from "./day-activities-carousel";
import { ServiceHoverLink } from "./service-hover-link";
import type { ServiceCardV2Data } from "./service-card-v2";
import { cn } from "@/lib/utils";

// =====================================================
// ITINERARY MARKDOWN RENDERER
// Renders markdown with inline UI components:
// - Day carousels after day headers
// - Hover cards on service names in tables
// =====================================================

interface DayData {
  day: number;
  activities: ServiceCardV2Data[];
}

interface ServiceData {
  name: string;
  cardData: ServiceCardV2Data;
}

interface ItineraryMarkdownRendererProps {
  content: string;
  days?: DayData[];
  services?: ServiceData[];
  showPricing?: boolean;
  currency?: string;
  className?: string;
}

/**
 * ItineraryMarkdownRenderer
 *
 * Renders markdown content with inline UI components:
 * - After "## Day X" headers, injects horizontal card carousel
 * - In tables, wraps known service names with hover cards
 */
export function ItineraryMarkdownRenderer({
  content,
  days = [],
  services = [],
  showPricing = true,
  currency = "USD",
  className,
}: ItineraryMarkdownRendererProps) {
  // Create lookup maps
  const dayMap = new Map<number, ServiceCardV2Data[]>();
  days.forEach((d) => dayMap.set(d.day, d.activities));

  const serviceMap = new Map<string, ServiceCardV2Data>();
  services.forEach((s) => serviceMap.set(s.name.toLowerCase().trim(), s.cardData));

  // Custom components for ReactMarkdown
  const components = {
    // Intercept h2 headers to inject day carousels
    h2: ({ children, ...props }: any) => {
      const text = String(children);

      // Check if this is a day header (e.g., "Day 1", "Day 2: Arrival")
      const dayMatch = text.match(/^Day\s+(\d+)/i);

      if (dayMatch) {
        const dayNum = parseInt(dayMatch[1], 10);
        const activities = dayMap.get(dayNum);

        return (
          <div className="day-section">
            <h2 className="text-lg font-semibold mt-6 mb-2" {...props}>
              {children}
            </h2>
            {activities && activities.length > 0 && (
              <div className="my-3">
                <DayActivitiesCarousel
                  activities={activities}
                  showPricing={showPricing}
                  currency={currency}
                />
              </div>
            )}
          </div>
        );
      }

      return <h2 className="text-lg font-semibold mt-6 mb-2" {...props}>{children}</h2>;
    },

    // Intercept h3 headers for day subsections
    h3: ({ children, ...props }: any) => {
      const text = String(children);
      const dayMatch = text.match(/^Day\s+(\d+)/i);

      if (dayMatch) {
        const dayNum = parseInt(dayMatch[1], 10);
        const activities = dayMap.get(dayNum);

        return (
          <div className="day-section">
            <h3 className="text-base font-semibold mt-4 mb-2" {...props}>
              {children}
            </h3>
            {activities && activities.length > 0 && (
              <div className="my-3">
                <DayActivitiesCarousel
                  activities={activities}
                  showPricing={showPricing}
                  currency={currency}
                />
              </div>
            )}
          </div>
        );
      }

      return <h3 className="text-base font-semibold mt-4 mb-2" {...props}>{children}</h3>;
    },

    // Intercept table cells to add hover cards on service names
    td: ({ children, ...props }: any) => {
      const text = String(children).trim();
      const lowerText = text.toLowerCase();

      // Check if this cell contains a known service name
      const cardData = serviceMap.get(lowerText);

      if (cardData) {
        return (
          <td className="px-3 py-2 text-sm" {...props}>
            <ServiceHoverLink data={cardData}>{text}</ServiceHoverLink>
          </td>
        );
      }

      // Also check for partial matches (service name might be part of the text)
      for (const [serviceName, data] of serviceMap.entries()) {
        if (lowerText.includes(serviceName) && serviceName.length > 5) {
          // Replace the service name with hover link
          const parts = text.split(new RegExp(`(${serviceName})`, 'i'));
          return (
            <td className="px-3 py-2 text-sm" {...props}>
              {parts.map((part, i) => {
                if (part.toLowerCase() === serviceName) {
                  return <ServiceHoverLink key={i} data={data}>{part}</ServiceHoverLink>;
                }
                return part;
              })}
            </td>
          );
        }
      }

      return <td className="px-3 py-2 text-sm" {...props}>{children}</td>;
    },

    // Style table elements
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse border border-border rounded-lg" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: any) => (
      <thead className="bg-muted/50" {...props}>{children}</thead>
    ),
    th: ({ children, ...props }: any) => (
      <th className="px-3 py-2 text-left text-sm font-medium border-b border-border" {...props}>
        {children}
      </th>
    ),
    tr: ({ children, ...props }: any) => (
      <tr className="border-b border-border last:border-0 hover:bg-muted/30" {...props}>
        {children}
      </tr>
    ),

    // Style other elements
    p: ({ children, ...props }: any) => (
      <p className="my-2 text-sm leading-relaxed" {...props}>{children}</p>
    ),
    ul: ({ children, ...props }: any) => (
      <ul className="my-2 ml-4 list-disc space-y-1" {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="my-2 ml-4 list-decimal space-y-1" {...props}>{children}</ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="text-sm" {...props}>{children}</li>
    ),
    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold" {...props}>{children}</strong>
    ),
    h1: ({ children, ...props }: any) => (
      <h1 className="text-xl font-bold mt-6 mb-3" {...props}>{children}</h1>
    ),
    h4: ({ children, ...props }: any) => (
      <h4 className="text-sm font-semibold mt-3 mb-1" {...props}>{children}</h4>
    ),
    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-4 border-primary/30 pl-4 my-3 text-muted-foreground italic" {...props}>
        {children}
      </blockquote>
    ),
    hr: (props: any) => <hr className="my-4 border-border" {...props} />,
    a: ({ children, href, ...props }: any) => (
      <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    ),
  };

  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default ItineraryMarkdownRenderer;

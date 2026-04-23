"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ServiceCardV2Detailed, type ServiceCardV2Data } from "./service-card-v2";
import { cn } from "@/lib/utils";

// =====================================================
// SERVICE HOVER LINK
// Wraps service names with HoverCard showing detailed popover
// Used in summary tables (Tours, Transfers, Hotels, etc.)
// =====================================================

interface ServiceHoverLinkProps {
  children: React.ReactNode;
  data: ServiceCardV2Data;
  className?: string;
}

/**
 * ServiceHoverLink - Wraps text with HoverCard popover
 * On hover, shows detailed service card (like Mindtrip UI)
 */
export function ServiceHoverLink({
  children,
  data,
  className,
}: ServiceHoverLinkProps) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            "cursor-pointer underline decoration-dotted decoration-muted-foreground/50",
            "hover:decoration-primary hover:text-primary transition-colors",
            className
          )}
        >
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-auto p-0 border-0 bg-transparent shadow-none"
        side="right"
        align="start"
        sideOffset={8}
      >
        <ServiceCardV2Detailed data={data} />
      </HoverCardContent>
    </HoverCard>
  );
}

export default ServiceHoverLink;

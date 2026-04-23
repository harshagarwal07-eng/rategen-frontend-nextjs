import { Badge } from "@/components/ui/badge";
import { findAmenityMatch } from "./amenity-mapper";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

interface AmenityBadgeProps {
  name: string;
  available?: boolean;
  showIcon?: boolean;
  showAvailability?: boolean;
  variant?: "default" | "secondary" | "outline";
  className?: string;
}

export function AmenityBadge({
  name,
  available = true,
  showIcon = true,
  showAvailability = false,
  variant = "outline",
  className,
}: AmenityBadgeProps) {
  const amenityMatch = findAmenityMatch(name);
  const displayName = amenityMatch?.config?.displayName || name;

  return (
    <Badge variant={variant} className={cn("flex items-center gap-1.5 w-fit", !available && "opacity-50", className)}>
      {showAvailability && (
        <>
          {available ? (
            <CheckCircle2 className="h-3 w-3 text-success" />
          ) : (
            <XCircle className="h-3 w-3 text-destructive" />
          )}
        </>
      )}
      {showIcon && amenityMatch?.config?.icon && (
        <span className="[&>svg]:h-3 [&>svg]:w-3">{amenityMatch.config.icon}</span>
      )}
      <span className={cn(!available && showAvailability && "line-through")}>{displayName}</span>
    </Badge>
  );
}

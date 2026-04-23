import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode, createElement, isValidElement } from "react";

interface InfoRowProps {
  icon?: LucideIcon | ReactNode;
  label: string;
  value: string | ReactNode;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export function InfoRow({
  icon: Icon,
  label,
  value,
  className,
  iconClassName,
  labelClassName,
  valueClassName,
}: InfoRowProps) {
  const renderIcon = () => {
    if (!Icon) return null;

    // Check if Icon is a component (function or ForwardRef)
    // Lucide icons can be functions or objects with $$typeof
    if (
      typeof Icon === "function" ||
      (typeof Icon === "object" && !isValidElement(Icon))
    ) {
      return createElement(Icon as LucideIcon, {
        className: cn("h-5 w-5", iconClassName)
      });
    }

    // Otherwise treat it as ReactNode (already rendered element)
    return <span className={cn("[&>svg]:h-5 [&>svg]:w-5", iconClassName)}>{Icon}</span>;
  };

  return (
    <div className={cn("flex items-start gap-3", className)}>
      {Icon && (
        <div
          className={cn("text-muted-foreground mt-0.5 shrink-0", iconClassName)}
        >
          {renderIcon()}
        </div>
      )}
      <div className="flex-1">
        <p className={cn("font-medium", labelClassName)}>{label}</p>
        <div className={cn("text-sm text-muted-foreground", valueClassName)}>
          {value}
        </div>
      </div>
    </div>
  );
}

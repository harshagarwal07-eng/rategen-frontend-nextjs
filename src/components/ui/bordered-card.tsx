import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface BorderedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  variant?: "default" | "dashed";
}

const BorderedCard = React.forwardRef<HTMLDivElement, BorderedCardProps>(
  (
    {
      className,
      title,
      children,
      collapsible = false,
      defaultOpen = true,
      variant = "default",
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    const toggleOpen = () => {
      if (collapsible) {
        setIsOpen(!isOpen);
      }
    };

    return (
      <div className="relative" ref={ref} {...props}>
        {title && (
          <div className="absolute -top-2.5 left-4 px-2 bg-card z-10 flex items-center gap-2">
            {collapsible && (
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 cursor-pointer",
                  !isOpen && "-rotate-90"
                )}
                onClick={toggleOpen}
              />
            )}
            <span
              className={cn(
                "text-xs font-medium text-muted-foreground uppercase tracking-wide",
                collapsible && "cursor-pointer select-none"
              )}
              onClick={toggleOpen}
            >
              {title}
            </span>
          </div>
        )}
        <div
          className={cn(
            "border-2 border-primary/20 rounded-lg bg-card transition-all duration-200",
            isOpen ? "p-4" : "p-4 pb-2",
            variant === "dashed" && "border-dashed border-border",
            className
          )}
        >
          {isOpen && children}
        </div>
      </div>
    );
  }
);

BorderedCard.displayName = "BorderedCard";

export { BorderedCard };

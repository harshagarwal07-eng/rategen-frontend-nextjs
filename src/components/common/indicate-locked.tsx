import { Lock } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  tooltip?: string;
  className?: string;
};

export default function IndicateLocked({ tooltip = "This item is locked", className = "" }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger
        asChild
        tabIndex={-1}
        type="button"
        className={cn("flex items-center justify-center", className)}
      >
        <Lock className={cn("inline text-primary size-4")} />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

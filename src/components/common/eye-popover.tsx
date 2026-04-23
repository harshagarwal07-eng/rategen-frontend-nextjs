import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EyeIcon } from "lucide-react";

type Props = {
  title: string;
  description: string;
};

export function EyePopover({ title, description }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <EyeIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          <p className="text-xs">{description}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

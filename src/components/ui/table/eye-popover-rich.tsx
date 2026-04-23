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

export function EyePopoverRich({ title, description }: Props) {
  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <EyeIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-2xl max-h-[500px] overflow-y-auto">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          <div
            className="text-xs prose prose-sm max-w-none rich-text"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

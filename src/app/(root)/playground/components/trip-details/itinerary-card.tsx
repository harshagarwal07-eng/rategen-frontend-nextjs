import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, ImageIcon, Plus } from "lucide-react";
import { ItineraryItem, ItineraryItemTemplate } from "@/types/crm-query";
import { TRIP_OPTIONS } from "@/constants/data";
import Show from "@/components/ui/show";
import { Button } from "@/components/ui/button";
import S3Image from "@/components/ui/s3-image";

type Props = {
  data: ItineraryItem | ItineraryItemTemplate;
  isCustom?: boolean;
  short?: boolean;
  onClick?: () => void;
  actions?: React.ReactNode;
  showPrice?: boolean;
};

// Get the appropriate category based on transfer mode
function getEffectiveCategory(data: ItineraryItem | ItineraryItemTemplate): string {
  const category = data.category;
  const transferMode = (data as any).transferMode;

  // If it's a transfer with a specific mode, use the mode-specific category
  if (category === "transfer" && transferMode) {
    const modeMap: Record<string, string> = {
      boat: "transfer_boat",
      speedboat: "transfer_speedboat",
      ferry: "transfer_ferry",
      helicopter: "transfer_helicopter",
    };
    return modeMap[transferMode.toLowerCase()] || category;
  }

  // Also check if the activity name contains boat/speedboat keywords
  if (category === "transfer") {
    const name = (data.name || "").toLowerCase();
    if (name.includes("speedboat")) return "transfer_speedboat";
    if (name.includes("boat") || name.includes("ferry")) return "transfer_boat";
    if (name.includes("helicopter") || name.includes("seaplane")) return "transfer_helicopter";
  }

  return category;
}

export default function ItineraryCard({ data, isCustom = false, short, onClick, actions, showPrice = true }: Props) {
  const effectiveCategory = getEffectiveCategory(data);
  const Icon = TRIP_OPTIONS.find((v) => v.value === effectiveCategory)?.icon || ImageIcon;

  // Get image URL - check for image_url or images array
  const imageUrl = (data as any).image_url || ((data as any).images && (data as any).images[0]);

  return (
    <Card
      className={cn(
        "w-full rounded-xl border py-0 px-1.5 cursor-pointer ",
        short && "min-h-20 justify-center",
        isCustom && "transition-all hover:border-primary hover:shadow-sm px-0",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      <CardContent className={cn("flex gap-3 p-3 h-full items-center", isCustom && "items-center")}>
        {/* Image thumbnail or Icon */}
        {imageUrl ? (
          <div className="size-12 shrink-0 rounded-lg overflow-hidden bg-muted relative">
            <S3Image
              url={imageUrl}
              index={0}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className={cn(
              "size-12 shrink-0 flex items-center justify-center rounded-xl",
              short && "w-14 h-14",
              isCustom ? "bg-primary/10" : "bg-muted",
            )}
          >
            <Icon className={cn("w-5 h-5", isCustom ? "text-primary" : "text-muted-foreground")} />
          </div>
        )}

        <div className="flex-1 ">
          {/* Title */}
          <p className="text-xs font-semibold flex items-center gap-1 truncate">
            <span className="truncate">{data.name}</span>
          </p>

          {/* Description */}
          <p className="flex text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1 shrink-0 mt-1" />
            <span className={isCustom ? "whitespace-pre-line" : ""}>{data.description}</span>
          </p>
        </div>

        <div className="flex flex-col justify-between items-end shrink-0">
          <Show when={!!actions}>{actions}</Show>
          {/* <Show when={!isCustom && showPrice}>
            <p className="font-bold text-primary text-xs whitespace-nowrap">
              ₹ {(data as ItineraryItem).price}
            </p>
          </Show> */}
        </div>

        {/* Add button - Only for custom */}
        <Show when={isCustom}>
          <Button
            variant={"outline"}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="bg-primary/10 border-primary/10 text-primary"
          >
            <Plus />
            Add
          </Button>
        </Show>
      </CardContent>
    </Card>
  );
}

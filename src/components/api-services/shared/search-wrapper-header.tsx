// import EditBookingSearchDialog from "@/components/dialogs/edit-booking-search-dialog";
import { Button } from "@/components/ui/button";
import { IApiServices } from "@/types/api-service";
import { Search } from "lucide-react";

type Props = {
  displayTexts: string[];
  category: IApiServices;
};

export default function SearchWrapperHeader({ displayTexts, category }: Props) {
  return (
    <div className="flex justify-between items-center bg-popover/20 backdrop-blur-md p-3 rounded-xl border border-border dark:border-0">
      <div className="text-muted-foreground space-y-0.5 text-sm">
        {displayTexts.map((text, idx) => (
          <p key={idx}>{text}</p>
        ))}
      </div>
      {/* <EditBookingSearchDialog category={category}>
        <Button>
          <Search /> Edit Search
        </Button>
      </EditBookingSearchDialog> */}
    </div>
  );
}

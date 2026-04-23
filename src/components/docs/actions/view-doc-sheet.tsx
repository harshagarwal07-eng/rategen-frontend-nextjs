import TiptapEditor from "@/components/editor/TiptapEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Show from "@/components/ui/show";
import { Doc } from "@/types/docs";
import { format } from "date-fns";
import {
  Eye,
  MapPin,
  Calendar,
  Users,
  Moon,
  Building2,
  Car,
  LucideFerrisWheel,
  UtensilsCrossed,
  Plane,
  Package,
  Palette,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ItineraryData, ServiceType } from "@/types/itinerary";

const SERVICE_ICONS: Record<ServiceType, React.ElementType> = {
  hotel: Building2,
  tour: LucideFerrisWheel,
  transfer: Car,
  meal: UtensilsCrossed,
  flight: Plane,
  combo: Package,
};

interface Props {
  title: string;
  showNights: boolean;
  doc: Doc;
  docType?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

function parseItineraryContent(content: string): ItineraryData | null {
  try {
    const data = JSON.parse(content);
    if (data.destination && data.days && Array.isArray(data.days)) {
      return data as ItineraryData;
    }
    return null;
  } catch {
    return null;
  }
}

function ItineraryViewer({ data }: { data: ItineraryData }) {
  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground">Destination</p>
            <p className="text-sm font-medium truncate">{data.destination}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground">Dates</p>
            <p className="text-sm font-medium truncate">
              {format(new Date(data.check_in), "MMM d")} – {format(new Date(data.check_out), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        {data.travelers && (
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Travelers</p>
              <p className="text-sm font-medium">
                {data.travelers.adults}A{data.travelers.children > 0 ? ` ${data.travelers.children}C` : ""}
              </p>
            </div>
          </div>
        )}
        {data.theme && (
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Theme</p>
              <p className="text-sm font-medium capitalize">{data.theme.replace(/[-_]/g, " ")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Days */}
      <div className="space-y-3">
        {data.days.map((day, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === data.days.length - 1;

          return (
            <div key={idx} className="rounded-lg border">
              {/* Day header */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/30">
                <div className="h-6 w-6 rounded text-xs font-medium flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                  {day.day}
                </div>
                {day.date && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(day.date), "EEE, MMM d")}
                  </span>
                )}
                <span className="text-sm font-medium">{day.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {day.activities.length} {day.activities.length === 1 ? "activity" : "activities"}
                </span>
              </div>

              {/* Activities */}
              {day.activities.length > 0 && (
                <div className="divide-y">
                  {day.activities.map((act, actIdx) => {
                    const Icon = SERVICE_ICONS[act.type] || Package;
                    return (
                      <div key={actIdx} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="shrink-0 h-7 w-7 rounded flex items-center justify-center bg-accent text-accent-foreground">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{act.name}</p>
                          {act.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">{act.subtitle}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0 capitalize">
                          {act.type}
                        </Badge>
                        {act.duration && (
                          <span className="text-xs text-muted-foreground shrink-0">{act.duration}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {day.activities.length === 0 && (
                <div className="px-4 py-4 text-center text-xs text-muted-foreground">
                  No activities planned
                </div>
              )}

              {/* Overnight */}
              {day.overnight && (
                <div className="flex items-center gap-2 px-4 py-2 border-t bg-muted/20">
                  <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{day.overnight}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ViewDocSheet({
  title,
  showNights,
  doc: viewingDoc,
  docType,
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}: Props) {
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);

  // Use external control when provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : isViewSheetOpen;
  const onOpenChange = externalOnClose ? (open: boolean) => {
    if (!open) externalOnClose();
  } : setIsViewSheetOpen;

  const editorRef = useRef<any>(null);

  const isItinerary = docType === "itineraries";
  const itineraryData = useMemo(() => {
    if (!isItinerary || !viewingDoc?.content) return null;
    return parseItineraryContent(viewingDoc.content);
  }, [isItinerary, viewingDoc?.content]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      {!externalIsOpen && (
        <SheetTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="View Full Content"
          >
            <Eye />
          </Button>
        </SheetTrigger>
      )}
      <SheetContent
        side="right"
        className="sm:max-w-screen-2xl w-full overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>View {title}</SheetTitle>
          <SheetDescription className="text-xs italic">
            Created on{" "}
            {viewingDoc && format(new Date(viewingDoc.created_at), "PPP")}
          </SheetDescription>
        </SheetHeader>
        <div className="p-4 h-full">
          {viewingDoc && (
            <div className="space-y-4 h-full">
              {/* Document Info */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Badge
                  variant={viewingDoc.is_active ? "default" : "destructive"}
                  className="text-xs"
                >
                  {viewingDoc.is_active ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">{viewingDoc.country_name}</Badge>
                <Show when={!!viewingDoc.service_type}>
                  <Badge variant="outline" className="capitalize">
                    {viewingDoc.service_type}
                  </Badge>
                </Show>
                {showNights && viewingDoc.nights && (
                  <Badge variant="secondary" className="capitalize">
                    {viewingDoc.nights} nights
                  </Badge>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0">
                {isItinerary && itineraryData ? (
                  <ItineraryViewer data={itineraryData} />
                ) : (
                  <TiptapEditor
                    initialContent={viewingDoc.content}
                    editorRef={editorRef}
                    noToolbar
                    readOnly
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

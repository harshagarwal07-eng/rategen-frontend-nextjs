"use client";

import { useMemo, useState } from "react";
import { Package, Wand2, Star, ChevronDown, Lock, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryBookingsWithActivities, autopopulateBookings } from "@/data-access/bookings";
import { getItineraryOptionsByChatId } from "@/data-access/itinerary-activities";
import { AddBookingDropdown } from "./bookings/add-booking-dropdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertModal } from "@/components/ui/alert-modal";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { cn } from "@/lib/utils";
import { BookingTableRow } from "@/types/ops-bookings";
import { ServiceType } from "@/data-access/itinerary-activities";
import { BookingsTableContent } from "./bookings/bookings-table-content";


interface BookingsSectionProps {
  queryId: string;
  chatId?: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; types: ServiceType[] }> = {
  all: { label: "All", types: [] },
  hotel: { label: "Hotels", types: ["hotel"] },
  tour: { label: "Tours", types: ["tour"] },
  transfer: { label: "Transfers", types: ["transfer"] },
};

export default function BookingsSection({ queryId, chatId }: BookingsSectionProps) {
  const queryClient = useQueryClient();
  const [isAutopopulating, setIsAutopopulating] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [pendingOptions, setPendingOptions] = useState<{ option_number: number; recommended: boolean | null }[]>([]);

  // Option switching state
  const [pendingSwitchOption, setPendingSwitchOption] = useState<number | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchAlertOpen, setSwitchAlertOpen] = useState(false);

  const executeAutopopulate = async (optionNumber: number) => {
    setIsAutopopulating(true);
    const result = await autopopulateBookings(queryId, optionNumber);
    setIsAutopopulating(false);

    if (!result.success) {
      toast.error(result.error || "Failed to autopopulate bookings");
      return;
    }

    if (result.inserted === 0) {
      toast.info(`No unbooked activities found for option ${optionNumber}`);
      return;
    }

    toast.success(`Created ${result.inserted} booking${result.inserted === 1 ? "" : "s"}`);
    queryClient.invalidateQueries({ queryKey: ["query-bookings", queryId] });
  };

  const handleAutopopulate = async () => {
    if (!chatId) {
      await executeAutopopulate(1);
      return;
    }

    const options = await getItineraryOptionsByChatId(chatId);

    if (options.length === 0) {
      toast.error("No itinerary options found");
      return;
    }

    if (options.length === 1) {
      await executeAutopopulate(options[0].option_number);
      return;
    }

    // Multiple options — let user pick
    setPendingOptions(options);
    setOptionDialogOpen(true);
  };

  const { data: bookingsData = { data: [], totalItems: 0 }, isLoading } = useQuery({
    queryKey: ["query-bookings", queryId],
    queryFn: () => getQueryBookingsWithActivities(queryId),
    enabled: !!queryId,
    staleTime: 30 * 1000,
  });

  const { data: allOptions = [] } = useQuery({
    queryKey: ["itinerary-options", chatId],
    queryFn: () => getItineraryOptionsByChatId(chatId!),
    enabled: !!chatId,
    staleTime: 60 * 1000,
  });

  const bookings: BookingTableRow[] = bookingsData.data.map((b: any) => ({
    id: b.id,
    itinerary_id: b.itinerary_id,
    service_name: b.service_name || "",
    service_type: b.service_type,
    start_date: b.check_in_date || b.tour_date || b.pickup_date || "",
    end_date: b.check_out_date || b.tour_date || b.drop_date || b.pickup_date || "",
    amount: b.cost_price || 0,
    currency: b.currency || "USD",
    booking_status: b.booking_status,
    payment_status: b.derived_payment_status ?? "not_configured",
    voucher_status: b.voucher_status,
    supplier_name: b.supplier_name || null,
    option_number: b.option_number ?? null,
  }));

  // Derive active option from first booking's option_number
  const activeOption = bookings.length > 0 ? (bookings[0].option_number ?? 1) : null;

  // Lock when any booking has a payment plan configured
  const isLocked = bookings.some((b) => b.payment_status !== "not_configured");

  const handleOptionSwitch = (optionNumber: number) => {
    setPendingSwitchOption(optionNumber);
    setSwitchAlertOpen(true);
  };

  const executeOptionSwitch = async () => {
    if (!pendingSwitchOption) return;
    setIsSwitching(true);
    setSwitchAlertOpen(false);

    // Delete all existing bookings and repopulate from new option (atomic in DB)
    const result = await autopopulateBookings(queryId, pendingSwitchOption, true);
    setIsSwitching(false);

    if (!result.success) {
      toast.error(result.error || "Failed to switch option");
    } else if (result.inserted === 0) {
      toast.info(`Switched to Option ${pendingSwitchOption} — no activities found`);
    } else {
      toast.success(
        `Switched to Option ${pendingSwitchOption} (${result.inserted} booking${result.inserted === 1 ? "" : "s"})`
      );
    }

    queryClient.invalidateQueries({ queryKey: ["query-bookings", queryId] });
    setPendingSwitchOption(null);
  };

  const availableCategories = useMemo(() => {
    const types = new Set(bookings.map((b) => b.service_type));
    const categories = [{ key: "all", ...CATEGORY_CONFIG.all }];

    Object.entries(CATEGORY_CONFIG).forEach(([key, config]) => {
      if (key !== "all" && config.types.some((t) => types.has(t))) {
        categories.push({ key, ...config });
      }
    });

    return categories;
  }, [bookings]);

  const getCategoryCount = (key: string) => {
    if (key === "all") return bookings.length;
    return bookings.filter((b) => CATEGORY_CONFIG[key]?.types.includes(b.service_type)).length;
  };

  const optionSelectionDialog = (
    <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Select Itinerary Option</DialogTitle>
          <DialogDescription>Choose which option to autopopulate bookings from.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {pendingOptions.map((opt) => (
            <Button
              key={opt.option_number}
              variant="outline"
              className="justify-start gap-2 h-10"
              onClick={() => {
                setOptionDialogOpen(false);
                executeAutopopulate(opt.option_number);
              }}
            >
              Option {opt.option_number}
              {opt.recommended && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOptionDialogOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Option switcher — only shown when chatId exists and there are multiple options
  const showOptionSwitcher = !!chatId && allOptions.length > 1 && activeOption !== null;

  const optionSwitcher = showOptionSwitcher ? (
    isLocked ? (
      <Button variant="outline" size="sm" disabled className="h-8 text-xs gap-1.5 cursor-not-allowed">
        <Lock className="h-3 w-3" />
        Option {activeOption}
      </Button>
    ) : (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1 min-w-28 justify-between"
            disabled={isSwitching}
          >
            {isSwitching ? "Switching..." : `Option ${activeOption}`}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-28">
          {allOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.option_number}
              onClick={() => opt.option_number !== activeOption && handleOptionSwitch(opt.option_number)}
              className={cn("cursor-pointer", opt.option_number === activeOption && "bg-accent")}
            >
              Option {opt.option_number}
              {opt.recommended && <Star className="h-3.5 w-3.5 ml-1 fill-yellow-400 text-yellow-400" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  ) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <>
        {optionSelectionDialog}
        <div className="flex items-center justify-center pt-8">
          <div className="border rounded-lg p-8 flex flex-col items-center gap-5 w-[420px]">
            <Package className="h-8 w-8 text-muted-foreground/40" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">No bookings yet</p>
              <p className="text-xs text-muted-foreground">Add manually or autopopulate from itinerary</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs w-full"
                onClick={handleAutopopulate}
                disabled={isAutopopulating}
              >
                <Wand2 className="h-3 w-3 mr-1.5" />
                {isAutopopulating ? "Populating..." : "Autopopulate"}
              </Button>
              <AddBookingDropdown queryId={queryId} optionNumber={activeOption} className="h-9 w-full" />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {optionSelectionDialog}
      <AlertModal
        isOpen={switchAlertOpen}
        onClose={() => {
          setSwitchAlertOpen(false);
          setPendingSwitchOption(null);
        }}
        onConfirm={executeOptionSwitch}
        loading={isSwitching}
        title={`Switch to Option ${pendingSwitchOption}?`}
        description="All current bookings for this query will be removed and replaced with bookings from the selected option. This cannot be undone."
      />
      <div className="h-full flex flex-col">
        <Tabs defaultValue="all" className="flex-1 flex flex-col">
          <div className="border-b bg-background/50 px-3 pb-2">
            <div className="flex items-center justify-between">
              <TabsList className="bg-transparent p-0 gap-2">
                {availableCategories.map((category) => {
                  const count = getCategoryCount(category.key);
                  return (
                    <TabsTrigger
                      key={category.key}
                      value={category.key}
                      className={cn(
                        "h-9 rounded-md px-2.5 py-1.5 gap-0.5",
                        "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
                        "text-muted-foreground hover:text-foreground hover:bg-muted font-normal"
                      )}
                    >
                      {category.label}
                      {count > 0 && (
                        <sup className="ml-0.5 text-[10px] tabular-nums data-[state=active]:text-primary text-muted-foreground/70">
                          {count}
                        </sup>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <div className="flex items-center gap-2">
                {optionSwitcher}
                <AddBookingDropdown queryId={queryId} optionNumber={activeOption} />
                <div className="h-4 w-px bg-border shrink-0 ml-2" />
                <TooltipButton
                  tooltip="Refresh bookings"
                  tooltipSide="bottom"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["query-bookings", queryId] })}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </TooltipButton>
              </div>
            </div>
          </div>

          {availableCategories.map((category) => (
            <TabsContent key={category.key} value={category.key} className="flex-1 mt-0 overflow-y-auto">
              <BookingsTableContent bookings={bookings} activeTab={category.key} queryId={queryId} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}

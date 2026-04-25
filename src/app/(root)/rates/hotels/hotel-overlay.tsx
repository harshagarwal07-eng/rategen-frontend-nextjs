"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHotel } from "@/data-access/dmc-hotels";
import { DmcHotel } from "@/types/hotels";
import GeneralInfoTab from "./tabs/general-info-tab";
import RoomsSeasonsTab from "./tabs/rooms-seasons-tab";

interface HotelOverlayProps {
  hotelId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const TABS = [
  { id: "general-info", label: "General Info", enabled: true },
  { id: "rooms-seasons", label: "Rooms & Seasons", enabled: true },
  { id: "rates", label: "Rates", enabled: false },
  { id: "supplements", label: "Supplements", enabled: false },
  { id: "offers", label: "Offers", enabled: false },
  { id: "perks", label: "Perks", enabled: false },
  { id: "policies", label: "Policies & Allocation", enabled: false },
];

export function HotelOverlay({ hotelId, isOpen, onClose }: HotelOverlayProps) {
  const [activeTab, setActiveTab] = useState("general-info");
  const [hotel, setHotel] = useState<DmcHotel | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && hotelId) {
      setActiveTab("general-info");
      setLoading(true);
      getHotel(hotelId).then((result) => {
        if (!result.error && result.data) setHotel(result.data);
        setLoading(false);
      });
    } else {
      setHotel(null);
    }
  }, [isOpen, hotelId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Hotel Details</DialogTitle>
        <DialogDescription className="sr-only">View and edit hotel details</DialogDescription>

        <div className="sticky top-0 z-10">
          <div className="border-b bg-background px-6 py-3 flex items-center justify-between">
            <div className="text-sm">
              {loading ? (
                <span className="text-muted-foreground italic">Loading…</span>
              ) : hotel ? (
                <span className="font-semibold text-base">{hotel.name}</span>
              ) : (
                <span className="text-muted-foreground italic">Hotel</span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          <div className="border-b bg-muted px-4 py-1">
            <div className="flex gap-0.5">
              {TABS.map((tab) => {
                const btn = (
                  <button
                    type="button"
                    disabled={!tab.enabled}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                      tab.id === activeTab
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                      !tab.enabled && "opacity-40 pointer-events-none"
                    )}
                  >
                    {tab.label}
                  </button>
                );

                if (!tab.enabled) {
                  return (
                    <Tooltip key={tab.id}>
                      <TooltipTrigger asChild>
                        <span className="inline-block cursor-not-allowed">{btn}</span>
                      </TooltipTrigger>
                      <TooltipContent>Coming soon</TooltipContent>
                    </Tooltip>
                  );
                }

                return <span key={tab.id}>{btn}</span>;
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "general-info" && <GeneralInfoTab />}
            {activeTab === "rooms-seasons" && <RoomsSeasonsTab />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

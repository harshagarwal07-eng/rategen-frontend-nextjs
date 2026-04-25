"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Save, X } from "lucide-react";
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
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [internalHotelId, setInternalHotelId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("general-info");
      setInternalHotelId(hotelId);
      if (hotelId) {
        setLoading(true);
        getHotel(hotelId).then((result) => {
          if (!result.error && result.data) setHotel(result.data);
          setLoading(false);
        });
      }
    } else {
      setHotel(null);
      setIsDirty(false);
      setInternalHotelId(null);
    }
  }, [isOpen, hotelId]);

  const handleClose = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    onClose();
  };

  const displayName = hotel?.name || "";
  const displayCountry = hotel?.country_name || "";
  const displayCity = hotel?.city_name || "";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent
          className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col"
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Hotel Details</DialogTitle>
          <DialogDescription className="sr-only">View and edit hotel details</DialogDescription>

          <div className="sticky top-0 z-10">
            <div className="border-b bg-background px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {loading ? (
                  <span className="text-muted-foreground italic">Loading…</span>
                ) : displayName ? (
                  <span className="font-semibold text-base">{displayName}</span>
                ) : (
                  <span className="text-muted-foreground italic">New Hotel</span>
                )}
                {!loading && displayCountry && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground">{displayCountry}</span>
                  </>
                )}
                {!loading && displayCity && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground">{displayCity}</span>
                  </>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            <div className="border-b bg-muted px-4 py-1">
              <div className="flex justify-center">
                <div className="flex bg-muted rounded-lg p-1">
                  {TABS.map((tab, index) => {
                    const isActive = tab.id === activeTab;
                    const btn = (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => tab.enabled && setActiveTab(tab.id)}
                        className={cn(
                          "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                          !tab.enabled && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted-foreground/20 text-muted-foreground"
                          )}
                        >
                          {index + 1}
                        </span>
                        <span>{tab.label}</span>
                        {isActive && isDirty && (
                          <span
                            className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"
                            aria-label="Unsaved changes"
                          />
                        )}
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

                    return btn;
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "general-info" && (
                <GeneralInfoTab
                  hotelId={internalHotelId}
                  initialHotel={hotel}
                  onSaved={(saved) => {
                    setHotel(saved);
                    setInternalHotelId(saved.id);
                  }}
                  onDirtyChange={setIsDirty}
                  formRef={formRef}
                  onSavingChange={setIsSaving}
                />
              )}
              {activeTab === "rooms-seasons" && <RoomsSeasonsTab />}
            </div>

            <div className="sticky bottom-0 border-t px-4 py-2 bg-muted">
              <div className="flex items-center justify-between">
                <div />
                <div className="flex items-center gap-3">
                  {isDirty && !isSaving && (
                    <span className="text-xs text-yellow-600 font-medium">Unsaved changes</span>
                  )}
                  <Button
                    type="button"
                    onClick={() => formRef.current?.requestSubmit()}
                    className="min-w-32"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDiscardDialog} onOpenChange={(open) => !open && setShowDiscardDialog(false)}>
        <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogTitle>Unsaved changes</DialogTitle>
          <DialogDescription>You have unsaved changes. Discard them?</DialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDiscardDialog(false)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDiscardDialog(false);
                onClose();
              }}
            >
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

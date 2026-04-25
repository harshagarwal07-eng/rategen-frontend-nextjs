"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Loader2, Save, X } from "lucide-react";
import { fdGetPackage } from "@/data-access/fixed-departures";
import { FDGeneralInfoTab } from "./fd-tabs/tab-general-info";
import { FDItineraryTab } from "./fd-tabs/tab-itinerary";
import { FDInclusionsExclusionsTab } from "./fd-tabs/tab-inclusions-exclusions";
import { FDAddonsTab } from "./fd-tabs/tab-addons";
import { FDTabPlaceholder } from "./fd-tabs/tab-placeholder";

export type FDTabHandle = {
  save: () => Promise<boolean>;
};

interface FDFullscreenFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId: string | null;
  onSaved?: () => void;
}

const TABS = [
  { id: "general", label: "General Info" },
  { id: "itinerary", label: "Itinerary" },
  { id: "inc-exc", label: "Inclusions & Exclusions" },
  { id: "addons", label: "Add-ons" },
  { id: "departures", label: "Departure Dates" },
  { id: "flights-visa", label: "Flights & Visa" },
  { id: "policies", label: "Policies" },
  { id: "docs-remarks", label: "Documents & Remarks" },
] as const;

type FDTabId = (typeof TABS)[number]["id"];

export function FDFullscreenForm({ open, onOpenChange, packageId, onSaved }: FDFullscreenFormProps) {
  const [activeTab, setActiveTab] = useState<FDTabId>("general");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [dirtyTabs, setDirtyTabs] = useState<Set<FDTabId>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const queryClient = useQueryClient();

  const generalRef = useRef<FDTabHandle>(null);
  const itineraryRef = useRef<FDTabHandle>(null);
  const incExcRef = useRef<FDTabHandle>(null);
  const addonsRef = useRef<FDTabHandle>(null);

  const effectiveId = packageId ?? createdId;
  const mode: "create" | "edit" = packageId ? "edit" : "create";

  useEffect(() => {
    if (open) {
      setActiveTab("general");
      setCreatedId(null);
      setDirtyTabs(new Set());
    }
  }, [open, packageId]);

  const { data: pkg } = useQuery({
    queryKey: ["fd-package", packageId],
    queryFn: () => fdGetPackage(packageId as string),
    enabled: !!packageId && open,
  });

  const isTabDisabled = (tabId: string) => {
    if (mode === "edit") return false;
    return tabId !== activeTab;
  };

  const handleAdvance = () => {
    const idx = TABS.findIndex((t) => t.id === activeTab);
    if (idx >= 0 && idx < TABS.length - 1) setActiveTab(TABS[idx + 1].id);
  };

  const tabIdx = useMemo(() => TABS.findIndex((t) => t.id === activeTab), [activeTab]);

  const handleBack = () => {
    if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id);
  };

  const trackDirty = (id: FDTabId) => (dirty: boolean) => {
    setDirtyTabs((prev) => {
      const has = prev.has(id);
      if (dirty === has) return prev;
      const next = new Set(prev);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const getActiveRef = (): React.RefObject<FDTabHandle | null> | null => {
    switch (activeTab) {
      case "general": return generalRef;
      case "itinerary": return itineraryRef;
      case "inc-exc": return incExcRef;
      case "addons": return addonsRef;
      default: return null;
    }
  };

  const handleSaveClick = async () => {
    const ref = getActiveRef();
    if (!ref?.current) return;
    setIsSaving(true);
    try {
      await ref.current.save();
    } finally {
      setIsSaving(false);
    }
  };

  const requestClose = () => {
    if (dirtyTabs.size > 0) {
      setShowDiscardDialog(true);
      return;
    }
    onOpenChange(false);
  };

  const confirmDiscard = () => {
    setShowDiscardDialog(false);
    setDirtyTabs(new Set());
    onOpenChange(false);
  };

  const title = mode === "create" ? "Add New Fixed Departure" : pkg?.name || "Edit Fixed Departure";
  const anyDirty = dirtyTabs.size > 0;
  const activeTabHasHandle = ["general", "itinerary", "inc-exc", "addons"].includes(activeTab);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) requestClose(); else onOpenChange(true); }}>
        <DialogContent
          className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <div className="sticky top-0 z-10">
            <div className="border-b bg-background px-6 py-3 flex items-center justify-between">
              <div className="text-base font-semibold">{title}</div>
              <DialogClose asChild>
                <button
                  type="button"
                  onClick={requestClose}
                  className="rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>

            <div className="border-b bg-muted px-4 py-1">
              <div className="flex justify-center overflow-x-auto">
                <div className="flex bg-muted rounded-lg p-1 shrink-0">
                  {TABS.map((t, i) => {
                    const isActive = activeTab === t.id;
                    const disabled = isTabDisabled(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && setActiveTab(t.id)}
                        className={cn(
                          "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                          disabled && "opacity-40 cursor-not-allowed"
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
                          {i + 1}
                        </span>
                        <span className="whitespace-nowrap">{t.label}</span>
                        {dirtyTabs.has(t.id) && (
                          <span
                            className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"
                            aria-label="Unsaved changes"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-5xl">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FDTabId)} className="w-full">
                <TabsContent value="general">
                  <FDGeneralInfoTab
                    ref={generalRef}
                    mode={mode}
                    packageId={effectiveId}
                    initialData={pkg ?? null}
                    onDirtyChange={trackDirty("general")}
                    onSaved={(newId) => {
                      if (mode === "create" && newId) setCreatedId(newId);
                      const idForInvalidate = newId ?? effectiveId;
                      if (idForInvalidate) {
                        queryClient.invalidateQueries({ queryKey: ["fd-package", idForInvalidate, "for-itinerary"] });
                      }
                      onSaved?.();
                    }}
                    onAdvance={handleAdvance}
                  />
                </TabsContent>
                <TabsContent value="itinerary">
                  <FDItineraryTab
                    ref={itineraryRef}
                    mode={mode}
                    packageId={effectiveId}
                    onDirtyChange={trackDirty("itinerary")}
                    onSaved={() => {
                      if (effectiveId) {
                        queryClient.invalidateQueries({ queryKey: ["fd-package", effectiveId, "for-itinerary"] });
                      }
                      onSaved?.();
                    }}
                    onAdvance={handleAdvance}
                  />
                </TabsContent>
                <TabsContent value="inc-exc">
                  <FDInclusionsExclusionsTab
                    ref={incExcRef}
                    mode={mode}
                    packageId={effectiveId}
                    onDirtyChange={trackDirty("inc-exc")}
                    onSaved={() => {
                      if (effectiveId) {
                        queryClient.invalidateQueries({ queryKey: ["fd-package", effectiveId, "for-inc-exc"] });
                        queryClient.invalidateQueries({ queryKey: ["fd-package", effectiveId] });
                      }
                      onSaved?.();
                    }}
                    onAdvance={handleAdvance}
                  />
                </TabsContent>
                <TabsContent value="addons">
                  <FDAddonsTab
                    ref={addonsRef}
                    mode={mode}
                    packageId={effectiveId}
                    onDirtyChange={trackDirty("addons")}
                    onSaved={() => {
                      if (effectiveId) {
                        queryClient.invalidateQueries({ queryKey: ["fd-package", effectiveId, "addons"] });
                      }
                      onSaved?.();
                    }}
                    onAdvance={handleAdvance}
                  />
                </TabsContent>
                <TabsContent value="departures"><FDTabPlaceholder title="Departure Dates" /></TabsContent>
                <TabsContent value="flights-visa"><FDTabPlaceholder title="Flights & Visa" /></TabsContent>
                <TabsContent value="policies"><FDTabPlaceholder title="Policies" /></TabsContent>
                <TabsContent value="docs-remarks"><FDTabPlaceholder title="Documents & Remarks" /></TabsContent>
              </Tabs>
            </div>
          </div>

          {activeTabHasHandle && (
            <div className="border-t bg-muted px-4 py-2">
              <div className="flex items-center justify-between">
                <div>
                  {tabIdx > 0 && mode === "create" && (
                    <Button type="button" variant="outline" onClick={handleBack}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {anyDirty && !isSaving && (
                    <span className="text-xs text-yellow-600 font-medium">Unsaved changes</span>
                  )}
                  <Button onClick={handleSaveClick} className="min-w-32" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : mode === "create" ? (
                      <>
                        Save &amp; Next
                        <ChevronRight className="ml-2 h-4 w-4" />
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
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes on {dirtyTabs.size} tab{dirtyTabs.size === 1 ? "" : "s"}. Discard?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

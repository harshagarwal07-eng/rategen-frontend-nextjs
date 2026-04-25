"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fdGetPackage } from "@/data-access/fixed-departures";
import { FDGeneralInfoTab } from "./fd-tabs/tab-general-info";
import { FDItineraryTab } from "./fd-tabs/tab-itinerary";
import { FDInclusionsExclusionsTab } from "./fd-tabs/tab-inclusions-exclusions";
import { FDAddonsTab } from "./fd-tabs/tab-addons";
import { FDTabPlaceholder } from "./fd-tabs/tab-placeholder";
import { useQueryClient } from "@tanstack/react-query";

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

export function FDFullscreenForm({ open, onOpenChange, packageId, onSaved }: FDFullscreenFormProps) {
  const [activeTab, setActiveTab] = useState<string>("general");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const effectiveId = packageId ?? createdId;
  const mode: "create" | "edit" = packageId ? "edit" : "create";

  useEffect(() => {
    if (open) {
      setActiveTab("general");
      setCreatedId(null);
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

  const title = mode === "create" ? "Add New Fixed Departure" : pkg?.name || "Edit Fixed Departure";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="border-b bg-muted px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-base font-semibold">{title}</div>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1">
              {TABS.map((t, i) => (
                <TabsTrigger key={t.id} value={t.id} disabled={isTabDisabled(t.id)}>
                  <span className="mr-1 text-xs opacity-60">{i + 1}.</span>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsContent value="general">
                <FDGeneralInfoTab
                  mode={mode}
                  packageId={effectiveId}
                  initialData={pkg ?? null}
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
                  mode={mode}
                  packageId={effectiveId}
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
                  mode={mode}
                  packageId={effectiveId}
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
                  mode={mode}
                  packageId={effectiveId}
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
      </DialogContent>
    </Dialog>
  );
}

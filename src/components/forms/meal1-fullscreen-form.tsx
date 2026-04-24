"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Loader2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MealProduct } from "@/types/meals1";
import Meal1GeneralInfoForm from "@/components/rates/meals1/tabs/tab1-general-info";
import Meal1PackagesForm from "@/components/rates/meals1/tabs/tab2-packages";
import { createMeal, updateMeal, listCuisines, getMealById } from "@/data-access/meals1";
import { toast } from "sonner";

interface Meal1FullscreenFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: MealProduct | null;
  onSuccess?: () => void;
}

const FORM_STEPS = [
  { id: "general", title: "General Info" },
  { id: "packages", title: "Packages" },
];

export default function Meal1FullscreenForm({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: Meal1FullscreenFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<MealProduct>({} as MealProduct);
  const [isLoading, setIsLoading] = useState(false);
  const [cuisines, setCuisines] = useState<{ id: string; name: string }[]>([]);
  const [contextInfo, setContextInfo] = useState({ name: "", countryName: "", cityName: "" });
  const [tab1Dirty, setTab1Dirty] = useState(false);
  const [tab2Dirty, setTab2Dirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const anyDirty = tab1Dirty || tab2Dirty;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      const data = initialData || ({} as MealProduct);
      setFormData(data);
      setContextInfo({
        name: data.name || "",
        countryName: data.country?.country_name || "",
        cityName: data.location?.city_name || "",
      });
      setTab1Dirty(false);
      setTab2Dirty(false);
    } else {
      setCurrentStep(0);
      setFormData({} as MealProduct);
      setContextInfo({ name: "", countryName: "", cityName: "" });
      setTab1Dirty(false);
      setTab2Dirty(false);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    listCuisines().then((r) => {
      if (!r.error && r.data) setCuisines(r.data);
    });
  }, []);

  const handleContextChange = useCallback((name: string, countryName: string) => {
    setContextInfo((prev) => ({ ...prev, name, countryName }));
  }, []);

  // Close without discard check — used after successful saves
  const forceClose = useCallback(() => {
    router.refresh();
    onClose();
  }, [router, onClose]);

  const handleNext = useCallback(
    async (data: any) => {
      if (currentStep === 0) {
        setIsLoading(true);
        try {
          const updatedData = { ...formData, ...data };
          const payload = {
            name: updatedData.name,
            currency: updatedData.currency,
            country_id: updatedData.country_id || null,
            geo_id: updatedData.geo_id || null,
          };

          let savedId: string;
          if (updatedData.id) {
            const result = await updateMeal(updatedData.id, payload);
            if (result.error) throw new Error(result.error);
            savedId = updatedData.id;
          } else {
            const result = await createMeal(payload);
            if (result.error || !result.data?.id) throw new Error(result.error || "Create failed");
            savedId = result.data.id;
          }

          const full = await getMealById(savedId);
          if (!full.error && full.data) {
            setFormData(full.data);
            setContextInfo({
              name: full.data.name || "",
              countryName: full.data.country?.country_name || "",
              cityName: full.data.location?.city_name || "",
            });
          } else {
            setFormData({ ...updatedData, id: savedId });
          }

          setCurrentStep(1);
          toast.success("Progress saved!");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to save meal");
        } finally {
          setIsLoading(false);
        }
      } else {
        // Packages tab managed all saves itself; just close
        forceClose();
      }
    },
    [formData, currentStep, forceClose]
  );

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleClose = () => {
    if (anyDirty) {
      setShowDiscardDialog(true);
    } else {
      forceClose();
    }
  };

  const handleSaveClick = () => {
    formRef.current?.requestSubmit();
  };

  const displayName = contextInfo.name || formData.name || "";
  const displayCountry = contextInfo.countryName || formData.country?.country_name || "";
  const displayCity = contextInfo.cityName || formData.location?.city_name || "";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col"
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Meal Configuration</DialogTitle>
          <DialogDescription className="sr-only">Edit meal product details and packages</DialogDescription>

          {/* Fixed Header */}
          <div className="sticky top-0 z-10">
            {/* Row 1: Close button */}
            <div className="bg-muted px-4 py-1 flex justify-end border-b">
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

            {/* Row 2: Context bar */}
            <div className="border-b bg-background px-6 py-2 flex items-center gap-2 text-sm min-h-[36px]">
              {displayName ? (
                <span className="font-semibold">{displayName}</span>
              ) : (
                <span className="text-muted-foreground italic">New Meal</span>
              )}
              {displayCountry && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-muted-foreground">{displayCountry}</span>
                </>
              )}
              {displayCity && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-muted-foreground">{displayCity}</span>
                </>
              )}
            </div>

            {/* Row 3: Tab stepper */}
            <div className="border-b bg-muted px-4 py-3">
              <div className="flex justify-center">
                <div className="flex bg-muted rounded-lg p-1">
                  {FORM_STEPS.map((step, index) => {
                    const stepDirty = index === 0 ? tab1Dirty : tab2Dirty;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          if (index === 1 && !formData.id) return;
                          setCurrentStep(index);
                        }}
                        className={cn(
                          "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                          index === currentStep
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                          index === 1 && !formData.id && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                            index === currentStep
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted-foreground/20 text-muted-foreground"
                          )}
                        >
                          {index + 1}
                        </span>
                        <span>{step.title}</span>
                        {stepDirty && (
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

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 pb-20">
              <div className="mx-auto max-w-full px-4">
                {currentStep === 0 && (
                  <Meal1GeneralInfoForm
                    initialData={formData.id ? formData : null}
                    onNext={handleNext}
                    setIsLoading={setIsLoading}
                    formRef={formRef as React.RefObject<HTMLFormElement>}
                    onContextChange={handleContextChange}
                    onDirtyChange={setTab1Dirty}
                  />
                )}
                {currentStep === 1 && formData.id && (
                  <Meal1PackagesForm
                    initialData={formData}
                    cuisines={cuisines}
                    onNext={handleNext}
                    setIsLoading={setIsLoading}
                    formRef={formRef as React.RefObject<HTMLFormElement>}
                    onDirtyChange={setTab2Dirty}
                  />
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="sticky bottom-0 border-t px-4 py-2 bg-muted">
              <div className="flex items-center justify-between">
                <div>
                  {currentStep > 0 && (
                    <Button type="button" variant="outline" onClick={handleBack}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {anyDirty && !isLoading && (
                    <span className="text-xs text-yellow-600 font-medium">Unsaved changes</span>
                  )}
                  <Button onClick={handleSaveClick} className="min-w-32" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : currentStep === FORM_STEPS.length - 1 ? (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>
                    ) : (
                      <>
                        Save & Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discard confirmation — shown when closing with unsaved changes */}
      <Dialog open={showDiscardDialog} onOpenChange={(open) => !open && setShowDiscardDialog(false)}>
        <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogTitle>Unsaved changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes. Discard?
          </DialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDiscardDialog(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={() => { setShowDiscardDialog(false); forceClose(); }}>
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

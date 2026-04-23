"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { IMealsDatastore } from "./schemas/meals-datastore-schema";
import MealForm from "./meal-sections/meal-form";
import MealSuppliersForm from "./meal-sections/meal-suppliers-form";
import { createMeal, updateMeal } from "@/data-access/meals";
import { syncSupplierAssociations } from "@/data-access/suppliers";
import { toast } from "sonner";

interface MealFullscreenFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: IMealsDatastore | null;
  syncedColumns?: string[];
  onSuccess?: () => void;
}

const FORM_STEPS = [
  { id: "general", title: "General Info" },
  { id: "suppliers", title: "Suppliers" },
];

export default function MealFullscreenForm({
  isOpen,
  onClose,
  initialData,
  syncedColumns = [],
  onSuccess,
}: MealFullscreenFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<IMealsDatastore>>({});
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setFormData(initialData || {});
    } else {
      setCurrentStep(0);
      setFormData({});
    }
  }, [isOpen, initialData]);

  const handleNext = async (data: any) => {
    setIsLoading(true);
    try {
      switch (currentStep) {
        case 0: {
          // Meal Info — create or update
          const updatedFormData = { ...formData, ...data };
          if (updatedFormData.id) {
            const result = await updateMeal(updatedFormData.id, updatedFormData);
            if ("error" in result && result.error) throw new Error(result.error);
            setFormData(updatedFormData);
          } else {
            const result = await createMeal(updatedFormData);
            if ("error" in result && result.error) throw new Error(result.error);
            setFormData({ ...updatedFormData, id: (result as any).data?.id });
          }
          break;
        }
        case 1: {
          // Suppliers
          if (!formData.id) throw new Error("Meal ID not found");
          const result = await syncSupplierAssociations({
            itemType: "meal",
            serviceId: formData.id,
            associations: data.associations,
          });
          if (result.error) throw new Error(result.error);
          break;
        }
        default:
          throw new Error("Invalid step");
      }

      if (currentStep < FORM_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
        toast.success("Progress saved successfully!");
      } else {
        toast.success("Meal saved successfully!");
        router.refresh();
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error("Error saving meal:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save meal data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleClose = () => {
    router.refresh();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Meal Configuration</DialogTitle>
        {/* Fixed Header */}
        <div className="sticky top-0">
          <DialogHeader className="space-y-4 border-b bg-muted">
            <div className="flex justify-center">
              <div className="flex bg-muted rounded-lg p-1">
                {FORM_STEPS.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(index)}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                      index === currentStep
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
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
                  </button>
                ))}
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 pb-20">
            <div className="mx-auto max-w-full px-4">
              {currentStep === 0 && (
                <MealForm
                  initialData={formData}
                  syncedColumns={syncedColumns}
                  onNext={handleNext}
                  formRef={formRef as React.RefObject<HTMLFormElement>}
                />
              )}
              {currentStep === 1 && (
                <MealSuppliersForm
                  initialData={formData as any}
                  syncedColumns={syncedColumns}
                  onNext={handleNext}
                  formRef={formRef as React.RefObject<HTMLFormElement>}
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
              <Button
                onClick={() => formRef.current?.requestSubmit()}
                className="min-w-32"
                loading={isLoading}
                loadingText="Saving..."
                disabled={isLoading}
              >
                {currentStep === FORM_STEPS.length - 1 ? (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Meal
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
      </DialogContent>
    </Dialog>
  );
}

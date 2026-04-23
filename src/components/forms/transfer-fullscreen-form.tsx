"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Transfer } from "@/types/transfers";
import TransferGeneralInfoForm from "./transfer-sections/transfer-general-info-form";
import TransferPoliciesForm from "./transfer-sections/transfer-policies-form";
import TransferPackagesForm from "./transfer-sections/transfer-packages-form";
import TransferSuppliersForm from "./transfer-sections/transfer-suppliers-form";
import { createTransfer, updateTransfer } from "@/data-access/transfers";
import { syncSupplierAssociations } from "@/data-access/suppliers";
import { toast } from "sonner";

interface TransferFullscreenFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Transfer | null;
  syncedColumns: string[];
  onSuccess?: () => void;
}

const FORM_STEPS = [
  { id: "general", title: "General Info", component: TransferGeneralInfoForm },
  { id: "policies", title: "Policies & Add-ons", component: TransferPoliciesForm },
  { id: "packages", title: "Packages & Rates", component: TransferPackagesForm },
  { id: "suppliers", title: "Suppliers", component: TransferSuppliersForm },
];

export default function TransferFullscreenForm({
  isOpen,
  onClose,
  initialData,
  syncedColumns,
  onSuccess,
}: TransferFullscreenFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Transfer>>({});
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form state when dialog opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setFormData(initialData || {});
    } else {
      // Reset completely when dialog closes
      setCurrentStep(0);
      setFormData({});
    }
  }, [isOpen, initialData]);

  const handleNext = useCallback(
    async (data: any) => {
      setIsLoading(true);
      try {
        if (currentStep === FORM_STEPS.length - 1) {
          // Suppliers step — sync associations
          if (!formData.id) throw new Error("Transfer ID not found");
          const result = await syncSupplierAssociations({
            itemType: "transfer",
            serviceId: formData.id,
            associations: data.associations,
          });
          if (result.error) throw new Error(result.error);
        } else {
          // Steps 0-2: update form data and save transfer record
          const updatedFormData = { ...formData, ...data };
          setFormData(updatedFormData);

          // Packages step (2) handles its own DB save — only save transfer record on steps 0-1
          if (currentStep < 2) {
            if (updatedFormData.id) {
              const result = await updateTransfer(updatedFormData.id, updatedFormData);
              if ("error" in result && result.error) throw new Error(result.error);
            } else if (currentStep === 0) {
              const result = await createTransfer(updatedFormData);
              if ("error" in result && result.error) throw new Error(result.error);
              const newTransfer = (result as any).data;
              updatedFormData.id = newTransfer.id;
              setFormData(updatedFormData);
            }
          }
        }

        if (currentStep < FORM_STEPS.length - 1) {
          setCurrentStep(currentStep + 1);
          toast.success("Progress saved successfully!");
        } else {
          toast.success("Transfer configuration completed successfully!");
          router.refresh();
          onSuccess?.();
          onClose();
        }
      } catch (error) {
        console.error("Error processing step:", error);
        toast.error(error instanceof Error ? error.message : "Failed to save transfer data");
      } finally {
        setIsLoading(false);
      }
    },
    [formData, currentStep, router, onSuccess, onClose]
  );

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleClose = () => {
    router.refresh();
    onClose();
  };

  const handleSaveClick = () => {
    formRef.current?.requestSubmit();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Transfer Configuration</DialogTitle>
        {/* Fixed Header */}
        <div className="sticky top-0">
          <DialogHeader className="space-y-4 border-b bg-muted">
            {/* Tabs Navigation */}
            <div className="flex justify-center">
              <div className="flex bg-muted rounded-lg p-1">
                {FORM_STEPS.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(index)}
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
              {(() => {
                const CurrentFormComponent = FORM_STEPS[currentStep].component;
                return (
                  <CurrentFormComponent
                    initialData={formData as any}
                    syncedColumns={syncedColumns}
                    onNext={handleNext}
                    formRef={formRef as React.RefObject<HTMLFormElement>}
                  />
                );
              })()}
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
                onClick={handleSaveClick}
                className="min-w-32"
                loading={isLoading}
                loadingText="Saving..."
                disabled={isLoading}
              >
                {currentStep === FORM_STEPS.length - 1 ? (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Transfer
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

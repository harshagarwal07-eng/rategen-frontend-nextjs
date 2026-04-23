"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ISupplierData } from "@/types/suppliers";
import SupplierDetailsForm from "./supplier-sections/supplier-details-form";
import SupplierProductsForm from "./supplier-sections/supplier-products-form";
import { upsertSupplierDetails, getSupplierDetailsById } from "@/data-access/suppliers";
import { toast } from "sonner";

interface SupplierFullscreenFormProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId?: string | null;
  onSuccess?: () => void;
}

const FORM_STEPS = [
  { id: "details", title: "Supplier Details", component: SupplierDetailsForm },
  { id: "products", title: "Products", component: SupplierProductsForm },
];

export default function SupplierFullscreenForm({
  isOpen,
  onClose,
  supplierId,
  onSuccess,
}: SupplierFullscreenFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<ISupplierData> & { city_name?: string; country_name?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setFormData({});
      return;
    }

    if (!supplierId) {
      // Create mode — start fresh
      setCurrentStep(0);
      setFormData({});
      return;
    }

    // Edit mode — fetch from DB
    let cancelled = false;
    setIsDataLoading(true);
    setCurrentStep(0);
    setFormData({});

    getSupplierDetailsById(supplierId).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load supplier data");
        onClose();
        return;
      }
      setFormData(data!);
      setIsDataLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, supplierId]);

  const handleNext = async (data: any) => {
    setIsLoading(true);
    try {
      if (currentStep === 0) {
        // Step 1 (Supplier Details) — persist to DB, get back real IDs
        const result = await upsertSupplierDetails({
          id: supplierId || undefined,
          name: data.name,
          category: data.category && data.category.length > 0 ? data.category : undefined,
          website: data.website || undefined,
          is_active: data.is_active,
          address: data.address || undefined,
          city: data.city || undefined,
          country: data.country || undefined,
          city_name: data.city_name || undefined,
          country_name: data.country_name || undefined,
          booking_mode: data.booking_mode || undefined,
          team_members: data.team_members,
        });

        if (result.error) throw new Error(result.error);

        // Store everything including the real supplier_id and team_member IDs from DB
        setFormData((prev) => ({
          ...prev,
          ...data,
          id: result.data!.supplier_id,
          team_members: result.data!.team_members,
        }));
        setCurrentStep(1);
        toast.success(supplierId ? "Supplier details updated!" : "Supplier created!");
      } else {
        // Step 2 (Products) — items are already saved on Add click; just close
        router.refresh();
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save supplier");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleClose = () => {
    onClose();
  };

  const CurrentFormComponent = FORM_STEPS[currentStep].component;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Supplier Configuration</DialogTitle>

        {/* Fixed Header — always rendered with both tabs */}
        <div className="sticky top-0">
          <DialogHeader className="space-y-4 border-b bg-muted">
            <div className="flex justify-center">
              <div className="flex bg-muted rounded-lg p-1">
                {FORM_STEPS.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => !isDataLoading && handleStepClick(index)}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                      index === currentStep
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                      isDataLoading && "pointer-events-none"
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
              {isDataLoading ? (
                <div className="space-y-6">
                  {/* Row 1: Supplier Name | Address */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>

                  {/* Row 2: Country | City */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>

                  {/* Row 3: Category | Website */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>

                  {/* Row 4: Booking Mode | Status */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                  </div>

                  {/* Contacts card */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <Skeleton className="h-5 w-20" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-14" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <CurrentFormComponent
                  initialData={
                    currentStep === 1
                      ? { supplierId: formData.id, team_members: formData.team_members, category: formData.category }
                      : formData
                  }
                  onNext={handleNext}
                />
              )}
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="sticky bottom-0 border-t px-4 py-2 bg-muted">
            <div className="flex items-center justify-between">
              <div>
                {currentStep > 0 && !isDataLoading && (
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
              </div>
              {isDataLoading ? (
                <Button type="button" variant="outline" onClick={handleClose} className="min-w-32">
                  Cancel
                </Button>
              ) : currentStep === FORM_STEPS.length - 1 ? (
                /* Step 2: items saved on Add click — just close */
                <Button type="button" onClick={() => handleNext({})} className="min-w-32">
                  Done
                </Button>
              ) : (
                /* Step 1: submit the form to trigger validation + save */
                <Button
                  onClick={() => {
                    const formElement = document.querySelector("form");
                    if (formElement) formElement.requestSubmit();
                  }}
                  className="min-w-32"
                  loading={isLoading}
                  loadingText="Saving..."
                  disabled={isLoading}
                >
                  Save & Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
